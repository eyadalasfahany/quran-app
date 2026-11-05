"""Ingest one moshaf: download (or reuse), measure, hash, copy (unless dry-run), record.

Dry run is the default: it never touches the store or the Worker client, even when they are passed in.
The manifest is written after every surah, so an interrupted run keeps what it finished.
"""

from __future__ import annotations

import copy
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from .api import Mp3QuranApi
from .audio import measure_duration_ms, sha256_file
from .errors import IngestError
from .keys import object_key, public_url
from .manifest import finalize, load_manifest, upsert_file, write_json_atomic
from .remote import download_file, head_file
from .store import ObjectStore
from .worker import WorkerClient

HAFS_REWAYA_ID = 1
SURAH_COUNT = 114


@dataclass(frozen=True)
class IngestRequest:
    moshaf_id: int
    surahs: tuple[int, ...] | None
    work_dir: Path
    manifest_path: Path
    public_base: str
    dry_run: bool = True
    source_dir: Path | None = None
    via: Literal["worker", "s3"] = "s3"


@dataclass(frozen=True)
class IngestResult:
    processed: int
    uploaded: int
    existing: int
    dry_run_files: int
    bytes_total: int
    duration_ms_total: int
    manifest_path: Path


def parse_surah_list(text: str) -> list[int]:
    return sorted(int(part) for part in text.split(",") if part.strip())


def find_moshaf(api: Mp3QuranApi, moshaf_id: int) -> dict[str, Any]:
    """Return the moshaf metadata that goes into the manifest (names in both languages)."""
    reciters_ar = api.reciters("ar")
    reciters_en = {str(r["id"]): r for r in api.reciters("eng")}
    riwayat_ar = {int(r["id"]): r["name"] for r in api.riwayat("ar")}
    for reciter in reciters_ar:
        for moshaf in reciter.get("moshaf", []):
            if int(moshaf["id"]) != moshaf_id:
                continue
            if int(moshaf["rewaya_id"]) != HAFS_REWAYA_ID:
                raise IngestError(
                    f"moshaf {moshaf_id} is not Hafs (rewaya_id {moshaf['rewaya_id']}); "
                    "only Hafs is ingested in v1 (ADR 0061 §10)"
                )
            english = reciters_en.get(str(reciter["id"]))
            if english is None:
                raise IngestError(f"reciter {reciter['id']} is missing from the English list")
            server = str(moshaf["server"])
            if not server.endswith("/"):
                raise IngestError(f"moshaf {moshaf_id} server does not end with '/'")
            return {
                "moshaf_id": moshaf_id,
                "reciter_id": int(reciter["id"]),
                "name_ar": reciter["name"],
                "name_en": english["name"],
                "riwayah": riwayat_ar.get(HAFS_REWAYA_ID, ""),
                "moshaf_name": moshaf["name"],
                "server": server,
                "surah_list": parse_surah_list(str(moshaf["surah_list"])),
            }
    raise IngestError(f"moshaf {moshaf_id} is not in the MP3Quran reciters list")


def select_surahs(meta: dict[str, Any], requested: tuple[int, ...] | None) -> list[int]:
    listed = meta["surah_list"]
    if requested is None:
        return listed
    unknown = [s for s in requested if s not in listed]
    if unknown:
        raise IngestError(f"surah(s) {unknown} are not in moshaf {meta['moshaf_id']}'s surah_list")
    return sorted(set(requested))


def upload_if_missing(store: ObjectStore, key: str, path: Path, size: int) -> str:
    """Upload only when the key is absent (--via s3). Keys hold a content hash, so a size mismatch is a fault."""
    existing = store.object_size(key)
    if existing is None:
        store.put_file(key, path)
        state = "uploaded"
    elif existing != size:
        raise IngestError(f"{key} exists with {existing} bytes, local file has {size}")
    else:
        state = "exists"
    if store.object_size(key) != size:
        raise IngestError(f"read-back check failed for {key}")
    return state


def copy_via_worker(
    worker: WorkerClient, store: ObjectStore, *, key: str, source_url: str, size: int, sha256: str
) -> str:
    """The Worker copies; the local file is never sent. Then HEAD R2 and check the size (--via worker)."""
    outcome = worker.copy(source_url=source_url, key=key, size=size, sha256=sha256)
    if store.object_size(key) != size:
        raise IngestError(f"read-back check failed for {key}")
    return "uploaded" if outcome == "copied" else "exists"


def run_ingest(
    request: IngestRequest,
    api: Mp3QuranApi,
    store: ObjectStore | None,
    *,
    now: str,
    measure: Callable[[Path], int] = measure_duration_ms,
    log: Callable[[str], None] = print,
    worker: WorkerClient | None = None,
) -> IngestResult:
    if not request.dry_run:
        if store is None:
            raise IngestError("an object store is required unless the run is a dry run")
        if request.via == "worker" and worker is None:
            raise IngestError("a worker client is required for --via worker")
    meta = find_moshaf(api, request.moshaf_id)
    surahs = select_surahs(meta, request.surahs)
    manifest = load_manifest(request.manifest_path, request.public_base)
    uploaded = existing = dry_files = 0
    bytes_total = duration_total = 0

    for surah in surahs:
        name = f"{surah:03}.mp3"
        url = f"{meta['server']}{name}"
        remote = head_file(url)
        local = request.source_dir / name if request.source_dir is not None else None
        if local is not None and local.is_file():
            size = local.stat().st_size
            if size != remote.content_length:
                raise IngestError(
                    f"{name}: local file has {size} bytes, source Content-Length is {remote.content_length}"
                )
            path = local
            log(f"{name}: using local {local}")
        else:
            path = request.work_dir / name
            download_file(url, path, remote.content_length)
            log(f"{name}: downloaded and verified ({remote.content_length} bytes)")

        duration_ms = measure(path)
        digest = sha256_file(path)
        size = path.stat().st_size
        key = object_key(meta["moshaf_id"], surah, digest)
        if request.dry_run:
            state = "dry-run"
            dry_files += 1
        else:
            assert store is not None
            if request.via == "worker":
                assert worker is not None
                state = copy_via_worker(
                    worker, store, key=key, source_url=url, size=size, sha256=digest
                )
            else:
                state = upload_if_missing(store, key, path, size)
            if state == "uploaded":
                uploaded += 1
            else:
                existing += 1

        entry = {
            "surah": surah,
            "key": key,
            "url": public_url(request.public_base, key),
            "bytes": size,
            "sha256": digest,
            "duration_ms": duration_ms,
            "source_url": url,
            "source_etag": remote.etag,
        }
        before = copy.deepcopy(manifest)
        upsert_file(manifest, meta, entry)
        finalize(manifest, now, request.public_base, before=before)
        write_json_atomic(request.manifest_path, manifest)
        bytes_total += size
        duration_total += duration_ms
        log(f"{name}: {state} {key} bytes={size} duration_ms={duration_ms}")

    return IngestResult(
        processed=len(surahs),
        uploaded=uploaded,
        existing=existing,
        dry_run_files=dry_files,
        bytes_total=bytes_total,
        duration_ms_total=duration_total,
        manifest_path=request.manifest_path,
    )

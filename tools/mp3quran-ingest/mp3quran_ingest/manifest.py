"""Manifest and catalogue files. Writes are atomic (temp file, then rename) and deterministic."""

from __future__ import annotations

import json
import os
import tempfile
from contextlib import suppress
from pathlib import Path
from typing import Any

from .errors import IngestError

MANIFEST_SCHEMA = 1
SOURCE = "mp3quran"


def write_json_atomic(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    descriptor, temp_name = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".tmp")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temp_name, 0o644)  # mkstemp creates 0600; committed files are readable
        os.replace(temp_name, path)
    except BaseException:
        with suppress(FileNotFoundError):
            os.unlink(temp_name)
        raise


def empty_manifest(public_base: str) -> dict[str, Any]:
    return {
        "schema": MANIFEST_SCHEMA,
        "source": SOURCE,
        "generated_at": None,
        "public_base": public_base,
        "moshafs": [],
    }


def load_manifest(path: Path, public_base: str) -> dict[str, Any]:
    if not path.is_file():
        return empty_manifest(public_base)
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema") != MANIFEST_SCHEMA or data.get("source") != SOURCE:
        raise IngestError(f"{path} is not an mp3quran manifest, schema 1")
    return data


def upsert_file(manifest: dict[str, Any], moshaf: dict[str, Any], entry: dict[str, Any]) -> None:
    """Add or replace one surah file of one moshaf. A replaced surah keeps no old entry."""
    record = next((m for m in manifest["moshafs"] if m["moshaf_id"] == moshaf["moshaf_id"]), None)
    if record is None:
        record = {**moshaf, "files": []}
        manifest["moshafs"].append(record)
    else:
        record.update(moshaf)
    record["files"] = [f for f in record["files"] if f["surah"] != entry["surah"]] + [entry]


def content_of(manifest: dict[str, Any]) -> dict[str, Any]:
    """Everything except `generated_at`: the part that decides whether a rerun changed anything."""
    return {key: value for key, value in manifest.items() if key != "generated_at"}


def finalize(
    manifest: dict[str, Any],
    generated_at: str,
    public_base: str,
    before: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Sort and stamp the manifest. `generated_at` moves only when the content differs from `before`.

    `before` is a snapshot taken before this surah's changes. Without it the stamp always moves.
    A no-op rerun therefore writes the same bytes as the file it read.
    """
    manifest["public_base"] = public_base
    manifest["moshafs"] = sorted(manifest["moshafs"], key=lambda m: m["moshaf_id"])
    for record in manifest["moshafs"]:
        record["files"] = sorted(record["files"], key=lambda f: f["surah"])
    if before is None or content_of(manifest) != content_of(before):
        manifest["generated_at"] = generated_at
    return manifest

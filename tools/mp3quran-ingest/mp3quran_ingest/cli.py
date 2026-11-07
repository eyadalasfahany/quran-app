"""Command line: `mp3quran-ingest catalogue`, `ingest` and `way2quran-list`. Local use only (ADR 0061 §7).

`ingest` is a dry run unless `--upload` is given. A dry run builds no S3 client and makes no Worker call.
`--source way2quran` takes `--reciter` (ADR 0074); its copy mode is s3 only, never the Worker.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from .api import Mp3QuranApi
from .catalogue import build_catalogue
from .config import (
    DEFAULT_API_BASE,
    DEFAULT_CATALOGUE_OUT,
    DEFAULT_DRY_MANIFEST,
    DEFAULT_DRY_WAY2QURAN_MANIFEST,
    DEFAULT_ENV_FILE,
    DEFAULT_MANIFEST,
    DEFAULT_WAY2QURAN_DATA,
    DEFAULT_WAY2QURAN_MANIFEST,
    DEFAULT_WORK_ROOT,
    R2Settings,
    load_r2_settings,
    load_worker_settings,
)
from .errors import IngestError
from .manifest import write_json_atomic
from .pipeline import IngestRequest, run_ingest
from .sources import resolve_mp3quran
from .store import R2Store
from .way2quran import Way2QuranSource, find_reciter, list_reciter, write_reciter
from .worker import WorkerClient


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _surah_number(text: str) -> int:
    value = int(text)
    if not 1 <= value <= 114:
        raise argparse.ArgumentTypeError("surah must be 1 to 114")
    return value


def _positive_int(text: str) -> int:
    value = int(text)
    if value < 1:
        raise argparse.ArgumentTypeError("must be 1 or more")
    return value


def make_store(settings: R2Settings) -> R2Store:
    """The only place an S3 client is built. Tests patch this to point at a mock."""
    return R2Store(settings)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mp3quran-ingest",
        description="Copy reciter surah files to Taybah's R2 bucket and write the manifest (ADR 0061, ADR 0074). "
        "Dry run unless --upload is given. Run on the developer's machine only.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    catalogue = sub.add_parser("catalogue", help="snapshot reciters, riwayat and timing readings")
    catalogue.add_argument("--out", type=Path, default=DEFAULT_CATALOGUE_OUT)
    catalogue.add_argument("--api-base", default=DEFAULT_API_BASE)

    ingest = sub.add_parser(
        "ingest",
        help="copy one reciter's surah files and record them (dry run unless --upload)",
        description="Dry run by default: downloads, measures and hashes, uploads nothing. "
        "Add --upload to copy to R2 (via the Worker by default for MP3Quran; s3 for Way2Quran).",
    )
    ingest.add_argument("--source", choices=("mp3quran", "way2quran"), default="mp3quran",
                        help="reciter source (default mp3quran)")
    ingest.add_argument("--moshaf", type=int, default=None,
                        help="MP3Quran moshaf id, for example 253 (source mp3quran)")
    ingest.add_argument("--reciter", type=_positive_int, default=None,
                        help="Way2Quran reciter id, for example 1 (source way2quran)")
    ingest.add_argument("--data", type=Path, default=DEFAULT_WAY2QURAN_DATA,
                        help="Way2Quran reciter data file (source way2quran)")
    ingest.add_argument("--surah", type=_surah_number, action="append", dest="surahs",
                        help="repeat for several surahs; default is every surah in surah_list")
    ingest.add_argument("--source-dir", type=Path, default=None,
                        help="reuse {NNN}.mp3 files here instead of downloading (bytes still checked)")
    ingest.add_argument("--work-dir", type=Path, default=None,
                        help="where downloads go (default tools/mp3quran-ingest/out/audio/<source>-ID)")
    ingest.add_argument("--manifest", type=Path, default=None,
                        help="default: out/dry-manifest.json (way2quran: out/dry-way2quran-manifest.json); "
                        "with --upload, apps/api/resources/mp3quran/manifest.json "
                        "(way2quran: apps/api/resources/way2quran/manifest.json)")
    mode = ingest.add_mutually_exclusive_group()
    mode.add_argument("--upload", action="store_true",
                      help="copy to R2 for real (required for any write)")
    mode.add_argument("--dry-run", action="store_true",
                      help="no-op: dry run is already the default (kept for older scripts)")
    ingest.add_argument("--via", choices=("worker", "s3"), default=None,
                        help="with --upload: worker (default for mp3quran) asks the Cloudflare Worker to copy; "
                        "s3 uploads from this machine (default for way2quran, the only mode it allows)")
    ingest.add_argument("--api-base", default=DEFAULT_API_BASE)
    ingest.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE)

    lister = sub.add_parser(
        "way2quran-list",
        help="read a Way2Quran reciter page, HEAD its Hafs files and (with --write) record the entry",
        description="Dry run by default: prints the entry and writes nothing. --write updates the reciter data file. "
        "Makes one page request and one HEAD per Hafs file; never downloads audio.",
    )
    lister.add_argument("--slug", required=True, help="reciter slug, for example hossam-el-din-ebadi")
    lister.add_argument("--reciter-id", type=_positive_int, required=True,
                        help="Taybah reciter id (never reused, ADR 0074 decision 5)")
    lister.add_argument("--name-ar", required=True, help="Arabic name, as the developer approves it")
    lister.add_argument("--name-en", required=True, help="English name, as the developer approves it")
    lister.add_argument("--write", action="store_true", help="update the reciter data file")
    lister.add_argument("--data", type=Path, default=DEFAULT_WAY2QURAN_DATA)
    return parser


def cmd_catalogue(args: argparse.Namespace) -> int:
    data = build_catalogue(Mp3QuranApi(args.api_base), utc_now())
    write_json_atomic(args.out, data)
    print(f"catalogue written: {args.out} (reciters ar {len(data['reciters']['ar'])}, "
          f"eng {len(data['reciters']['eng'])}, reads {len(data['ayat_timing_reads'])})")
    return 0


def _check_source_args(args: argparse.Namespace) -> None:
    if args.source == "way2quran":
        if args.reciter is None:
            raise IngestError("--reciter is required with --source way2quran")
        if args.moshaf is not None:
            raise IngestError("--moshaf applies only to --source mp3quran")
        if args.via == "worker":
            raise IngestError("--via worker is refused for way2quran: the copy Worker is pinned to MP3Quran "
                              "(ADR 0074 decision 9); use --via s3")
    else:
        if args.moshaf is None:
            raise IngestError("--moshaf is required with --source mp3quran")
        if args.reciter is not None:
            raise IngestError("--reciter applies only to --source way2quran")


def cmd_ingest(args: argparse.Namespace) -> int:
    _check_source_args(args)
    upload = bool(args.upload)
    way2quran = args.source == "way2quran"
    if args.via is not None and not upload:
        raise IngestError("--via only applies with --upload")
    via = args.via or ("s3" if way2quran else "worker")

    if not upload:
        print("MODE: dry run (no uploads)")
        settings = load_r2_settings(env_file=args.env_file, require_credentials=False)
        store = None
        worker = None
        manifest_default = DEFAULT_DRY_WAY2QURAN_MANIFEST if way2quran else DEFAULT_DRY_MANIFEST
    else:
        settings = load_r2_settings(env_file=args.env_file, require_credentials=True)
        worker_settings = load_worker_settings(env_file=args.env_file) if via == "worker" else None
        print(f"MODE: UPLOAD via {via} to bucket {settings.bucket}")
        store = make_store(settings)
        worker = WorkerClient(worker_settings) if worker_settings is not None else None
        manifest_default = DEFAULT_WAY2QURAN_MANIFEST if way2quran else DEFAULT_MANIFEST

    source = None
    if way2quran:
        source = Way2QuranSource(reciter=find_reciter(args.reciter, args.data))
        moshaf_id = args.reciter
        work_name = f"way2quran-{args.reciter}"
    else:
        moshaf_id = args.moshaf
        work_name = f"mp3quran-{args.moshaf}"
    work_dir = args.work_dir or (DEFAULT_WORK_ROOT / work_name)
    manifest_path = args.manifest if args.manifest is not None else manifest_default
    request = IngestRequest(
        moshaf_id=moshaf_id,
        surahs=tuple(args.surahs) if args.surahs else None,
        work_dir=work_dir,
        manifest_path=manifest_path,
        public_base=settings.public_base,
        dry_run=not upload,
        source_dir=args.source_dir,
        via=via,
    )
    api = Mp3QuranApi(args.api_base)
    if source is None:
        source = resolve_mp3quran(api, args.moshaf)
    result = run_ingest(request, api, store, now=utc_now(), worker=worker, source=source)
    if upload:
        summary = f"uploaded {result.uploaded}, already in R2 {result.existing}"
    else:
        summary = f"dry-run {result.dry_run_files}, nothing uploaded"
    print(f"done: processed {result.processed} surah(s), {summary}; "
          f"bytes {result.bytes_total}, duration_ms {result.duration_ms_total}; "
          f"manifest {result.manifest_path}")
    return 0


def cmd_way2quran_list(args: argparse.Namespace) -> int:
    result = list_reciter(
        slug=args.slug,
        reciter_id=args.reciter_id,
        name_ar=args.name_ar,
        name_en=args.name_en,
    )
    reciter = result.reciter
    surahs = sorted(reciter.files)
    print(f"reciter {reciter.reciter_id} ({reciter.slug}): {len(surahs)} Hafs file(s) listed, "
          f"{result.ignored} other-riwayah file(s) ignored")
    print(f"surah_list: {','.join(str(s) for s in surahs)}")
    print(f"total bytes: {result.total_bytes}")
    if args.write:
        write_reciter(args.data, reciter)
        print(f"written: {args.data}")
    else:
        print("dry: nothing written (add --write to update the reciter data file)")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "catalogue":
            return cmd_catalogue(args)
        if args.command == "way2quran-list":
            return cmd_way2quran_list(args)
        return cmd_ingest(args)
    except IngestError as exc:
        print(f"mp3quran-ingest: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

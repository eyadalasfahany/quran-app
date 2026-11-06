"""Command line: `mp3quran-ingest catalogue` and `mp3quran-ingest ingest`. Local use only (ADR 0061 §7).

`ingest` is a dry run unless `--upload` is given. A dry run builds no S3 client and makes no Worker call.
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
    DEFAULT_ENV_FILE,
    DEFAULT_MANIFEST,
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
from .worker import WorkerClient


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _surah_number(text: str) -> int:
    value = int(text)
    if not 1 <= value <= 114:
        raise argparse.ArgumentTypeError("surah must be 1 to 114")
    return value


def make_store(settings: R2Settings) -> R2Store:
    """The only place an S3 client is built. Tests patch this to point at a mock."""
    return R2Store(settings)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mp3quran-ingest",
        description="Copy MP3Quran surah files to Taybah's R2 bucket and write the manifest (ADR 0061). "
        "Dry run unless --upload is given. Run on the developer's machine only.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    catalogue = sub.add_parser("catalogue", help="snapshot reciters, riwayat and timing readings")
    catalogue.add_argument("--out", type=Path, default=DEFAULT_CATALOGUE_OUT)
    catalogue.add_argument("--api-base", default=DEFAULT_API_BASE)

    ingest = sub.add_parser(
        "ingest",
        help="copy one moshaf's surah files and record them (dry run unless --upload)",
        description="Dry run by default: downloads, measures and hashes, uploads nothing. "
        "Add --upload to copy to R2 (via the Worker by default).",
    )
    ingest.add_argument("--moshaf", type=int, required=True, help="MP3Quran moshaf id, for example 253")
    ingest.add_argument("--surah", type=_surah_number, action="append", dest="surahs",
                        help="repeat for several surahs; default is every surah in surah_list")
    ingest.add_argument("--source-dir", type=Path, default=None,
                        help="reuse {NNN}.mp3 files here instead of downloading (bytes still checked)")
    ingest.add_argument("--work-dir", type=Path, default=None,
                        help="where downloads go (default tools/mp3quran-ingest/out/audio/mp3quran-ID)")
    ingest.add_argument("--manifest", type=Path, default=None,
                        help="default: out/dry-manifest.json; with --upload, apps/api/resources/mp3quran/manifest.json")
    mode = ingest.add_mutually_exclusive_group()
    mode.add_argument("--upload", action="store_true",
                      help="copy to R2 for real (required for any write)")
    mode.add_argument("--dry-run", action="store_true",
                      help="no-op: dry run is already the default (kept for older scripts)")
    ingest.add_argument("--via", choices=("worker", "s3"), default=None,
                        help="with --upload: worker (default) asks the Cloudflare Worker to copy; "
                        "s3 uploads from this machine")
    ingest.add_argument("--api-base", default=DEFAULT_API_BASE)
    ingest.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE)
    return parser


def cmd_catalogue(args: argparse.Namespace) -> int:
    data = build_catalogue(Mp3QuranApi(args.api_base), utc_now())
    write_json_atomic(args.out, data)
    print(f"catalogue written: {args.out} (reciters ar {len(data['reciters']['ar'])}, "
          f"eng {len(data['reciters']['eng'])}, reads {len(data['ayat_timing_reads'])})")
    return 0


def cmd_ingest(args: argparse.Namespace) -> int:
    upload = bool(args.upload)
    if args.via is not None and not upload:
        raise IngestError("--via only applies with --upload")
    via = args.via or "worker"

    if not upload:
        print("MODE: dry run (no uploads)")
        settings = load_r2_settings(env_file=args.env_file, require_credentials=False)
        store = None
        worker = None
        manifest_default = DEFAULT_DRY_MANIFEST
    else:
        settings = load_r2_settings(env_file=args.env_file, require_credentials=True)
        worker_settings = load_worker_settings(env_file=args.env_file) if via == "worker" else None
        print(f"MODE: UPLOAD via {via} to bucket {settings.bucket}")
        store = make_store(settings)
        worker = WorkerClient(worker_settings) if worker_settings is not None else None
        manifest_default = DEFAULT_MANIFEST

    work_dir = args.work_dir or (DEFAULT_WORK_ROOT / f"mp3quran-{args.moshaf}")
    manifest_path = args.manifest if args.manifest is not None else manifest_default
    request = IngestRequest(
        moshaf_id=args.moshaf,
        surahs=tuple(args.surahs) if args.surahs else None,
        work_dir=work_dir,
        manifest_path=manifest_path,
        public_base=settings.public_base,
        dry_run=not upload,
        source_dir=args.source_dir,
        via=via,
    )
    api = Mp3QuranApi(args.api_base)
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


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "catalogue":
            return cmd_catalogue(args)
        return cmd_ingest(args)
    except IngestError as exc:
        print(f"mp3quran-ingest: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

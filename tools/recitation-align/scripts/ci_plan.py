"""Plan an add-reciter run: refuse bad moshafs, or emit the align matrix (ADR 0061, CI amendment).

    python3 scripts/ci_plan.py --moshafs 253,86 --chunks 6
    python3 scripts/ci_plan.py --source way2quran --moshafs 1 --chunks 6
    python3 scripts/ci_plan.py --source way2quran --moshafs 1 --quality

An empty --chunks means the source's default (6 for mp3quran, 20 for way2quran, P2). Quality mode (Way2Quran only,
ADR 0077) is `--quality` or `QUALITY=true` in the environment; the workflow's plan step passes the environment
only, so its command line is the same for both sources (P16). Quality mode changes nothing in the plan itself.

Writes `chunks` (JSON list of {moshaf, chunk, surahs}) and `moshafs` (JSON list of ids) to $GITHUB_OUTPUT
when it is set. Standard library only: no torch is installed for this job. A way2quran plan reads only the
reciter data file and the committed Way2Quran manifest; it makes no MP3Quran call (ADR 0074).
"""

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from recitation_align import ci  # noqa: E402

REPO = Path(__file__).resolve().parents[3]
MANIFEST = REPO / ci.MANIFEST_PATHS[ci.MANIFEST_SOURCE]
PHP = REPO / "apps/api/config/quran.php"
TANZIL = REPO / "packages/quran-text-check/data/tanzil-quran-simple-1.1.txt"
WAY2QURAN_DATA = REPO / "tools/mp3quran-ingest/mp3quran_ingest/way2quran_reciters.json"


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--source", choices=ci.SOURCES, default=ci.MANIFEST_SOURCE,
                   help="mp3quran (moshaf ids, the default) or way2quran (reciter ids)")
    p.add_argument("--moshafs", required=True)
    p.add_argument("--chunks", default="",
                   help="chunks per moshaf, 1 to 20; empty: 6 for mp3quran, 20 for way2quran")
    p.add_argument("--quality", action="store_true",
                   help="Way2Quran quality mode (also QUALITY=true in the environment); the plan is unchanged")
    p.add_argument("--done", default="",
                   help="resume: comma-separated hand-off artifact names an earlier run uploaded")
    p.add_argument("--manifest", type=Path, default=None,
                   help="committed manifest of the source (default: its path in the repository)")
    p.add_argument("--php", type=Path, default=PHP)
    p.add_argument("--tanzil", type=Path, default=TANZIL)
    p.add_argument("--data", type=Path, default=WAY2QURAN_DATA, help="Way2Quran reciter data file")
    args = p.parse_args(argv)
    manifest_path = args.manifest or REPO / ci.MANIFEST_PATHS[args.source]
    way2quran = args.source == ci.WAY2QURAN_SOURCE
    quality = args.quality or os.environ.get("QUALITY", "").strip().lower() == "true"
    try:
        if quality and not way2quran:
            raise ci.CiError("quality mode is for the way2quran source only")
        moshafs = ci.parse_moshaf_ids(args.moshafs)
        chunks = ci.parse_chunks(args.chunks, args.source)
        manifest = ci.load_json_or_none(manifest_path)
        if way2quran:
            # No API object is built for Way2Quran: the plan cannot reach MP3Quran.
            result = ci.plan(None, moshafs, chunks, manifest=manifest, php_source=None,
                             tanzil_path=args.tanzil, source=args.source,
                             way2quran_data=json.loads(args.data.read_text(encoding="utf-8")))
        else:
            result = ci.plan(ci.Api(), moshafs, chunks, manifest=manifest,
                             php_source=args.php.read_text(encoding="utf-8"), tanzil_path=args.tanzil,
                             source=args.source)
        done = ci.parse_done_artifacts(args.done, args.source)
        if done:
            kept = ci.drop_done_chunks(result["chunks"], done, args.source)
            print(f"resume: {len(result['chunks']) - len(kept)} chunk(s) reused, {len(kept)} to align",
                  file=sys.stderr)
            result["chunks"] = kept
    except ci.CiError as err:
        print(f"::error::{err}", file=sys.stderr)
        return 1
    if quality:
        print("quality mode: completeness, then alignment of the complete surahs, then upload", file=sys.stderr)
    print(json.dumps(result, separators=(",", ":")))
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as handle:
            handle.write("chunks=" + json.dumps(result["chunks"], separators=(",", ":")) + "\n")
            handle.write("moshafs=" + json.dumps(result["moshafs"], separators=(",", ":")) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

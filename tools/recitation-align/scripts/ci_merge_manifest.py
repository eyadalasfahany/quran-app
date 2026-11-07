"""Merge one moshaf's chunk manifest parts into the committed manifest; refuse partial reciters.

    python3 scripts/ci_merge_manifest.py --moshaf 86 --parts DIR --aligned DIR
    python3 scripts/ci_merge_manifest.py --source way2quran --moshaf 1 --parts DIR --aligned DIR

Writes the source's committed manifest in place (atomic; created when absent). Other moshafs keep their bytes.
Also checks that every surah has an aligned NNN.json before anything is written.
"""

import argparse
import json
import sys
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL))

from recitation_align import ci  # noqa: E402

REPO = TOOL.parents[1]
MANIFEST = REPO / ci.MANIFEST_PATHS[ci.MANIFEST_SOURCE]


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--source", choices=ci.SOURCES, default=ci.MANIFEST_SOURCE,
                   help="mp3quran (the default) or way2quran (the reciter id goes in --moshaf)")
    p.add_argument("--moshaf", type=int, required=True)
    p.add_argument("--parts", type=Path, required=True, help="directory of manifest-MOSHAF-CHUNK.json parts")
    p.add_argument("--aligned", type=Path, required=True, help="directory of aligned NNN.json files")
    p.add_argument("--manifest", type=Path, default=None,
                   help="committed manifest of the source (default: its path in the repository)")
    args = p.parse_args(argv)
    manifest_path = args.manifest or REPO / ci.MANIFEST_PATHS[args.source]
    try:
        part_files = sorted(args.parts.glob(f"manifest-{args.moshaf}-*.json"))
        if not part_files:
            raise ci.CiError(f"no manifest parts for moshaf {args.moshaf}")
        parts = [json.loads(path.read_text(encoding="utf-8")) for path in part_files]
        committed = ci.load_json_or_none(manifest_path)
        merged = ci.merge_manifest(committed, parts, args.moshaf, args.source)
        record = next(r for r in merged["moshafs"] if int(r["moshaf_id"]) == args.moshaf)
        ci.check_aligned(args.aligned, [int(s) for s in record["surah_list"]])
        ci.write_text_atomic(manifest_path, ci.encode_manifest(merged))
    except ci.CiError as err:
        print(f"::error::{err}", file=sys.stderr)
        return 1
    print(f"merged {len(part_files)} part(s) into {manifest_path.name} for moshaf {args.moshaf}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

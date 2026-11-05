"""Merge one moshaf's chunk manifest parts into the committed manifest; refuse partial reciters.

    python3 scripts/ci_merge_manifest.py --moshaf 86 --parts DIR --aligned DIR

Writes the committed manifest in place (atomic). Other moshafs keep their bytes. Also checks that every
surah has an aligned NNN.json before anything is written.
"""

import argparse
import json
import sys
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL))

from recitation_align import ci  # noqa: E402

REPO = TOOL.parents[1]
MANIFEST = REPO / "apps/api/resources/mp3quran/manifest.json"


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--moshaf", type=int, required=True)
    p.add_argument("--parts", type=Path, required=True, help="directory of manifest-MOSHAF-CHUNK.json parts")
    p.add_argument("--aligned", type=Path, required=True, help="directory of aligned NNN.json files")
    p.add_argument("--manifest", type=Path, default=MANIFEST)
    args = p.parse_args(argv)
    try:
        part_files = sorted(args.parts.glob(f"manifest-{args.moshaf}-*.json"))
        if not part_files:
            raise ci.CiError(f"no manifest parts for moshaf {args.moshaf}")
        parts = [json.loads(path.read_text(encoding="utf-8")) for path in part_files]
        committed = ci.load_json_or_none(args.manifest)
        merged = ci.merge_manifest(committed, parts, args.moshaf)
        record = next(r for r in merged["moshafs"] if int(r["moshaf_id"]) == args.moshaf)
        ci.check_aligned(args.aligned, [int(s) for s in record["surah_list"]])
        ci.write_text_atomic(args.manifest, ci.encode_manifest(merged))
    except ci.CiError as err:
        print(f"::error::{err}", file=sys.stderr)
        return 1
    print(f"merged {len(part_files)} part(s) into {args.manifest.name} for moshaf {args.moshaf}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

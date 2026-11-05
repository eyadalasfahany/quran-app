"""Quality table for the PR body: per surah counts and lowest ayah confidence (no text).

    python3 scripts/ci_quality.py --moshaf 86 --aligned DIR --out PATH
"""

import argparse
import json
import sys
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL))

from recitation_align import ci  # noqa: E402

REPO = TOOL.parents[1]


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--moshaf", type=int, required=True)
    p.add_argument("--aligned", type=Path, required=True)
    p.add_argument("--manifest", type=Path, default=REPO / "apps/api/resources/mp3quran/manifest.json")
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args(argv)
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    record = next(r for r in manifest["moshafs"] if int(r["moshaf_id"]) == args.moshaf)
    surahs = [int(s) for s in record["surah_list"]]
    try:
        text = ci.quality_summary(args.aligned, surahs)
    except (OSError, ValueError, KeyError) as err:
        print(f"::error::quality summary failed: {err}", file=sys.stderr)
        return 1
    ci.write_text_atomic(args.out, text)
    print(f"quality summary written for {len(surahs)} surah(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

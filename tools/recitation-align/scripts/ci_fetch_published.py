"""Fetch MP3Quran published ayah timings for one chunk into out/published/MOSHAF/raw-N.json.

    python3 scripts/ci_fetch_published.py --moshaf 86 --surah 1 --surah 2
"""

import argparse
import sys
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL))

from recitation_align import ci  # noqa: E402


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--moshaf", type=int, required=True)
    p.add_argument("--surah", type=int, action="append", required=True, dest="surahs")
    args = p.parse_args(argv)
    out = TOOL / "out" / "published" / str(args.moshaf)
    try:
        written = ci.fetch_published(ci.Api(), args.moshaf, args.surahs, out)
    except ci.CiError as err:
        print(f"::error::{err}", file=sys.stderr)
        return 1
    print(f"fetched {len(written)} published surah file(s) for moshaf {args.moshaf}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

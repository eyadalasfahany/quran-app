"""Check that what was uploaded is what was measured (ADR 0077, plan way2quran-quality Q3, P1).

  w2q_verify_upload.py --reciter ID --dry DRY.json --uploaded UPLOAD.json --surah N [--surah N ...]

The dry manifest holds the sha256, bytes and key of the files the completeness check and the aligner read.
The upload manifest holds what went to R2. The upload is accepted only if its surahs are exactly the intended
list and, for each, `sha256`, `bytes` and `key` equal the dry entry's. Exit 1 names every difference.
"""

import argparse
import json
import sys
from pathlib import Path

FIELDS = ("sha256", "bytes", "key")


def entries(path: Path, reciter: int) -> dict[int, dict]:
    doc = json.loads(path.read_text(encoding="utf-8"))
    records = [m for m in doc.get("moshafs", []) if m.get("moshaf_id") == reciter]
    if len(records) != 1:
        raise SystemExit(f"{path} has no single record for reciter {reciter}")
    return {int(f["surah"]): f for f in records[0].get("files", [])}


def differences(dry: dict[int, dict], uploaded: dict[int, dict], intended: list[int]) -> list[str]:
    bad: list[str] = []
    if sorted(uploaded) != sorted(set(intended)):
        bad.append(f"uploaded surahs {sorted(uploaded)} differ from the intended {sorted(set(intended))}")
    for surah in sorted(uploaded):
        if surah not in dry:
            bad.append(f"surah {surah}: uploaded but absent from the dry manifest")
            continue
        for name in FIELDS:
            if dry[surah].get(name) != uploaded[surah].get(name):
                bad.append(f"surah {surah}: {name} differs between the dry run and the upload")
    return bad


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--reciter", type=int, required=True)
    p.add_argument("--dry", type=Path, required=True)
    p.add_argument("--uploaded", type=Path, required=True)
    p.add_argument("--surah", type=int, action="append", default=[], dest="surahs")
    args = p.parse_args(argv)
    bad = differences(entries(args.dry, args.reciter), entries(args.uploaded, args.reciter), args.surahs)
    for line in bad:
        print(f"::error::{line}", file=sys.stderr)
    if bad:
        return 1
    print(f"upload verified: {len(args.surahs)} surah(s) match the dry run")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Plan an add-reciter run: refuse bad moshafs, or emit the align matrix (ADR 0061, CI amendment).

    python3 scripts/ci_plan.py --moshafs 253,86 --chunks 6

Writes `chunks` (JSON list of {moshaf, chunk, surahs}) and `moshafs` (JSON list of ids) to $GITHUB_OUTPUT
when it is set. Standard library only: no torch is installed for this job.
"""

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from recitation_align import ci  # noqa: E402

REPO = Path(__file__).resolve().parents[3]
MANIFEST = REPO / "apps/api/resources/mp3quran/manifest.json"
PHP = REPO / "apps/api/config/quran.php"
TANZIL = REPO / "packages/quran-text-check/data/tanzil-quran-simple-1.1.txt"


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--moshafs", required=True)
    p.add_argument("--chunks", default="6")
    p.add_argument("--done", default="",
                   help="resume: comma-separated align-MOSHAF-CHUNK artifacts an earlier run uploaded")
    p.add_argument("--manifest", type=Path, default=MANIFEST)
    p.add_argument("--php", type=Path, default=PHP)
    p.add_argument("--tanzil", type=Path, default=TANZIL)
    args = p.parse_args(argv)
    try:
        moshafs = ci.parse_moshaf_ids(args.moshafs)
        chunks = ci.parse_chunks(args.chunks)
        manifest = ci.load_json_or_none(args.manifest)
        result = ci.plan(ci.Api(), moshafs, chunks, manifest=manifest,
                         php_source=args.php.read_text(encoding="utf-8"), tanzil_path=args.tanzil)
        done = ci.parse_done_artifacts(args.done)
        if done:
            kept = ci.drop_done_chunks(result["chunks"], done)
            print(f"resume: {len(result['chunks']) - len(kept)} chunk(s) reused, {len(kept)} to align",
                  file=sys.stderr)
            result["chunks"] = kept
    except ci.CiError as err:
        print(f"::error::{err}", file=sys.stderr)
        return 1
    print(json.dumps(result, separators=(",", ":")))
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as handle:
            handle.write("chunks=" + json.dumps(result["chunks"], separators=(",", ":")) + "\n")
            handle.write("moshafs=" + json.dumps(result["moshafs"], separators=(",", ":")) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

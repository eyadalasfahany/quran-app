"""Way2Quran quality-mode reports (plan way2quran-quality Q1).

  merge     --reciter ID --handoff DIR --out PATH --run-id ID [--previous PATH] [--reciters PATH]
            [--allow-pending-gate]
  markdown  --report PATH --out FILE

`merge` reads the per-surah records under DIR (completeness/, gate/, refused/) and the reciter's entry in
`way2quran_reciters.json`, then writes the reciter report. `markdown` writes the PR body.
`--allow-pending-gate` (Q3, until the gate exists): a complete surah with no gate record is `pending`, and the
report is never releasable.
"""

import argparse
import json
import sys
from pathlib import Path

from recitation_align.completeness import duration_flags
from recitation_align.report import merge_reciter_report, pr_markdown, validate_reciter_report

TOOL = Path(__file__).resolve().parent.parent
DEFAULT_RECITERS = TOOL.parent / "mp3quran-ingest" / "mp3quran_ingest" / "way2quran_reciters.json"


def _dump(data: dict) -> str:
    return json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def cmd_merge(args) -> int:
    doc = json.loads(Path(args.reciters).read_text(encoding="utf-8"))
    matches = [r for r in doc["reciters"] if r["reciter_id"] == args.reciter]
    if len(matches) != 1:
        print(f"reciter {args.reciter} is not in {args.reciters}", file=sys.stderr)
        return 2
    entry = {"reciter_id": args.reciter, "files": matches[0]["files"]}
    previous = json.loads(Path(args.previous).read_text(encoding="utf-8")) if args.previous else None
    records = [json.loads(p.read_text(encoding="utf-8"))
               for p in sorted((Path(args.handoff) / "completeness").glob("[0-9][0-9][0-9].json"))]
    report = merge_reciter_report(Path(args.handoff), entry, args.run_id, previous=previous,
                                  duration_flags=duration_flags(records),
                                  allow_pending_gate=args.allow_pending_gate)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(_dump(report), encoding="utf-8")
    rel = report["release"]
    print(f"releasable={rel['releasable']} rules_failed={','.join(rel['rules_failed']) or '-'}")
    return 0


def cmd_markdown(args) -> int:
    report = json.loads(Path(args.report).read_text(encoding="utf-8"))
    validate_reciter_report(report)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(pr_markdown(report), encoding="utf-8")
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)

    m = sub.add_parser("merge")
    m.add_argument("--reciter", type=int, required=True)
    m.add_argument("--handoff", required=True)
    m.add_argument("--out", required=True)
    m.add_argument("--run-id", required=True)
    m.add_argument("--previous", default=None)
    m.add_argument("--reciters", default=str(DEFAULT_RECITERS))
    m.add_argument("--allow-pending-gate", action="store_true")
    m.set_defaults(func=cmd_merge)

    k = sub.add_parser("markdown")
    k.add_argument("--report", required=True)
    k.add_argument("--out", required=True)
    k.set_defaults(func=cmd_markdown)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())

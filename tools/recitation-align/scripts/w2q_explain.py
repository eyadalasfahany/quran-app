"""Why a Way2Quran surah failed the quality gate, as markdown for the CI log (plan way2quran-quality).

    python3 tools/recitation-align/scripts/w2q_explain.py --handoff DIR [--surah N ...] [--out FILE]

Reads `completeness/`, `gate/` and `refused/` (NNN.json) of a hand-off folder and prints the details of every surah:
the completeness verdict, the refusal, the gate reasons, the failed G3 starts, G4 bad spots, G5 outliers, the stretched
words, G6 low-confidence ayahs, middle-gap breaks and the repairs (rejected ones with their failed checks). A surah that
passed prints its heading only. Each list is capped at CAP items. Writes --out when given and appends to
$GITHUB_STEP_SUMMARY when set. It is a report, so it always exits 0. Standard library only.
"""

import argparse
import json
import os
import sys
from pathlib import Path

CAP = 30
SUBDIRS = ("completeness", "gate", "refused")


def _text(item) -> str:
    return item if isinstance(item, str) else json.dumps(item, ensure_ascii=False)


def _join(items: list) -> str:
    more = len(items) - CAP
    return ", ".join(_text(i) for i in items[:CAP]) + (f", … +{more} more" if more > 0 else "")


def _cap(bullets: list[str]) -> list[str]:
    more = len(bullets) - CAP
    return bullets[:CAP] + ([f"- … +{more} more"] if more > 0 else [])


def _repair_label(repair: dict) -> str:
    region = repair.get("region") or ["?"]
    where = region[0] if region[0] == region[-1] else f"{region[0]}-{region[-1]}"
    word = f" {repair['word']}" if repair.get("word") else ""
    return f"{repair.get('kind', 'repair')}{word} ({where})"


def _gate_bullets(gate: dict) -> list[str]:
    checks = gate.get("checks") or {}
    out = [f"- gate reasons: {_join(gate['reasons'])}"] if gate.get("reasons") else []
    g3 = checks.get("G3") or {}
    if g3.get("failed"):
        out.append(f"- G3 failed ayah starts: {_join(g3['failed'])}")
    if g3.get("unprobed"):
        out.append(f"- G3 unprobed: {_join(g3['unprobed'])}")
    if (checks.get("G4") or {}).get("bad_at"):
        out.append(f"- G4 bad at: {_join(checks['G4']['bad_at'])}")
    g5 = checks.get("G5") or {}
    if g5 and g5.get("status") != "pass":
        note = f" ({g5['reason']})" if g5.get("reason") else ""
        line = f"- G5 status: {g5.get('status')}{note}"
        if "outlier_ayahs" in g5:
            line += f", outlier ayahs: {_join(g5['outlier_ayahs']) or 'none'}"
        out.append(line)
    stretch = checks.get("stretch") or {}
    if stretch.get("words"):
        words = [f"{key} word {index} ({ms / 1000:.1f} s)" for key, index, ms in stretch["words"]]
        out.append(f"- stretched words: {_join(words)}")
    if stretch.get("elongations"):
        out.append(f"- elongations: {_join(stretch['elongations'])}")
    if (checks.get("G6") or {}).get("low_conf_ayahs"):
        out.append(f"- G6 low-confidence ayahs: {_join(checks['G6']['low_conf_ayahs'])}")
    middle = checks.get("middle_gap") or {}
    if middle.get("flag"):
        breaks = middle.get("breaks") or []
        out.append(f"- middle gap breaks: {_join(breaks)}" if breaks else "- middle gap flagged")
    repairs = gate.get("repairs") or []
    accepted = [r for r in repairs if r.get("accepted")]
    rejected = [r for r in repairs if not r.get("accepted")]
    if repairs:
        out.append(f"- repairs: {len(accepted)} accepted, {len(rejected)} rejected")
    out += _cap([f"- {_repair_label(r)}: {_join(r.get('failed') or ['no reason'])}" for r in rejected])
    if accepted:
        out.append(f"- accepted: {_join([_repair_label(r) for r in accepted])}")
    return out


def explain_surah(surah: int, comp: dict | None, gate: dict | None, refused: dict | None) -> list[str]:
    """The markdown lines for one surah: a heading, then the bullets of what failed (none when it passed)."""
    verdict = (gate or {}).get("verdict") or ("refused" if refused else (comp or {}).get("verdict")) or "no record"
    lines = [f"#### Surah {surah}: {verdict}"]
    if verdict == "pass" and not refused:
        return lines
    if comp and comp.get("verdict") not in (None, "complete"):
        heard = [f", {k.replace('_', ' ')} {comp[k]}" for k in ("first_heard_ayah", "last_heard_ayah")
                 if comp.get(k) is not None]
        lines.append(f"- completeness: {comp['verdict']}" + "".join(heard))
    if refused:
        lines.append(f"- refused at {refused.get('stage')}: {refused.get('reason')}")
    if gate:
        lines += _gate_bullets(gate)
    return lines


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else None


def surah_numbers(handoff: Path) -> list[int]:
    return sorted({int(p.stem) for sub in SUBDIRS for p in (handoff / sub).glob("[0-9][0-9][0-9].json")})


def report(handoff: Path, surahs: list[int] | None) -> str:
    head = ["## Gate details (Way2Quran quality)", ""]
    numbers = sorted(surahs) if surahs else surah_numbers(handoff)
    if not numbers:
        return "\n".join(head + ["No surah records."]) + "\n"
    records = []
    for n in numbers:
        name = f"{n:03d}.json"
        records.append((n, read_json(handoff / "completeness" / name), read_json(handoff / "gate" / name),
                        read_json(handoff / "refused" / name)))
    if all(gate and gate.get("verdict") == "pass" and not refused for _, _, gate, refused in records):
        return "\n".join(head + ["All surahs passed."]) + "\n"
    body = []
    for n, comp, gate, refused in records:
        body += [*explain_surah(n, comp, gate, refused), ""]
    return "\n".join(head + body).rstrip() + "\n"


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--handoff", type=Path, required=True, help="the merged hand-off folder")
    p.add_argument("--surah", type=int, nargs="+", default=None, help="only these surahs (default: every record)")
    p.add_argument("--out", type=Path, default=None, help="also write the markdown here")
    args = p.parse_args(argv)
    text = report(args.handoff, args.surah)
    print(text, end="")
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as handle:
            handle.write(text)
    return 0  # a report, not a check


if __name__ == "__main__":
    sys.exit(main())

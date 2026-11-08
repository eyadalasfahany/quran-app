"""The CI calibration check (plan way2quran-quality Q10, P9): assert the known outcomes, measure the speed, project.

    w2q_calibration_check.py check --reciter 3 --handoff DIR [--calibration FILE] [--out PIECE.json]
    w2q_calibration_check.py combine --artifacts DIR --run-id N [--out checks/ci-calibration.json]

`check` is the "Calibration summary" step of the finalize job: it reads one reciter's merged hand-off folder
(`completeness/ gate/ aligned/`), asserts that reciter's expected outcomes, writes a markdown table to the job
summary ($GITHUB_STEP_SUMMARY) and exits 1 on any failed expectation.

`combine` runs after the dispatch, on the downloaded artifacts (`gh run download RUN --pattern 'align-w2q-*' --dir DIR`):
every `DIR/<artifact>/chunk-R-C.json` marks a reciter's hand-off. It checks every reciter, pools the measured speed
over both, projects the chunk time of reciters 1, 2 and 3 (P9) and writes `checks/ci-calibration.json`.

Expected outcomes (ADR 0077, Q11b amendment):
- 3/015 and 3/055: complete, gate `pass`; 3/018: complete, gate `pass` or `repaired`;
- 3/016 (incomplete-both, recorded range 53-119), 3/019 (incomplete-end, 1-76) and 3/023 (incomplete-end, 1-22):
  the completeness verdict and the recorded range are asserted; the gate verdict must satisfy
  `partial_gate_ok` (the one rule to tighten once the partial-range outcome is final);
- 1/005: gate `repaired`, with 5:31 and 5:85 inside an accepted repair; 1/009: complete.

Speed: a surah's stage seconds come from the records (`completeness.seconds`, `anchors.seconds` asr/locate/align,
`gate.seconds` g3/g4/g2/repair). `asr` is also partly inside `locate`, so the total slightly over-counts. The
emissions pass and the dry ingest are not recorded, so the projection adds `EMISSIONS_RTF` and `FIXED_OVERHEAD_MIN`.
Standard library only (plus `recitation_align.ci` for the Tanzil letter weights).
"""

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from recitation_align import ci  # noqa: E402
from w2q_explain import explain_surah  # noqa: E402

REPO = Path(__file__).resolve().parents[3]
CALIBRATION = REPO / ci.CALIBRATION_PATH
TANZIL = REPO / "packages/quran-text-check/data/tanzil-quran-simple-1.1.txt"
WAY2QURAN_DATA = REPO / "tools/mp3quran-ingest/mp3quran_ingest/way2quran_reciters.json"
OUT = REPO / "tools/recitation-align/checks/ci-calibration.json"

SCHEMA = 1
PROJECT_RECITERS = (1, 2, 3)
CHUNKS = 20  # the Way2Quran default (P2)
LIMIT_MIN = 240  # P9: above this a chunk moves ASR_EVERY from 4 to 6
EMISSIONS_RTF = 0.328  # ADR 0077 section 7: emissions plus alignment on 4 vCPU. Emissions are not recorded; an upper bound.
FIXED_OVERHEAD_MIN = 15.0  # checkout, uv sync, model cache, dry ingest download and hash: an assumption, not measured
STAGES = ("completeness", "asr", "locate", "align", "g3", "g4", "g2", "repair")

# The one rule for the partial surahs' gate verdict (Q11b). Before the tools part lands the gate says `unavailable`;
# after it, a recorded range that passes the gate is `pass` or `repaired`. Tighten this tuple when the outcome is final.
PARTIAL_GATE_VERDICTS = ("unavailable", "pass", "repaired")


def partial_gate_ok(verdict: str) -> bool:
    return verdict in PARTIAL_GATE_VERDICTS


EXPECTED = {
    (3, 15): {"completeness": "complete", "gate": ("pass",)},
    (3, 16): {"completeness": "incomplete-both", "range": (53, 119), "partial": True},
    (3, 18): {"completeness": "complete", "gate": ("pass", "repaired")},
    (3, 19): {"completeness": "incomplete-end", "range": (1, 76), "partial": True},
    (3, 23): {"completeness": "incomplete-end", "range": (1, 22), "partial": True},
    (3, 55): {"completeness": "complete", "gate": ("pass",)},
    (1, 5): {"completeness": "complete", "gate": ("repaired",), "repaired_ayahs": (31, 85)},
    (1, 9): {"completeness": "complete"},
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else None


def repaired_ayah(repairs: list[dict], surah: int, ayah: int) -> bool:
    """The ayah lies inside the region of an accepted repair (region = ["S:lo", "S:hi"])."""
    for repair in repairs or []:
        if not repair.get("accepted"):
            continue
        try:
            (s1, lo), (s2, hi) = (tuple(int(x) for x in k.split(":")) for k in repair["region"])
        except (KeyError, ValueError):
            continue
        if s1 == surah == s2 and lo <= ayah <= hi:
            return True
    return False


def load_surah(handoff: Path, reciter: int, surah: int) -> dict:
    """One surah's records and measured seconds from a hand-off folder."""
    name = f"{surah:03d}.json"
    comp = read_json(handoff / "completeness" / name)
    gate = read_json(handoff / "gate" / name)
    aligned = read_json(handoff / "aligned" / name)
    refused = read_json(handoff / "refused" / name)
    entry = {"reciter": reciter, "surah": surah, "comp": comp, "gate": gate, "aligned": aligned, "refused": refused}
    seconds = {}
    if comp:
        seconds["completeness"] = float(comp.get("seconds") or 0)
    anchors = (aligned or {}).get("anchors") or {}
    for key in ("asr", "locate", "align"):
        if key in (anchors.get("seconds") or {}):
            seconds[key] = float(anchors["seconds"][key])
    for key in ("g3", "g4", "g2", "repair"):
        if key in ((gate or {}).get("seconds") or {}):
            seconds[key] = float(gate["seconds"][key])
    entry["seconds"] = seconds
    entry["audio_s"] = round(comp["duration_ms"] / 1000, 1) if comp else None
    entry["aligned_here"] = aligned is not None
    return entry


def check_surah(entry: dict) -> list[str]:
    """The failed expectations of one surah (empty when it matches or has no expectation)."""
    spec = EXPECTED.get((entry["reciter"], entry["surah"]))
    label = f"{entry['reciter']}/{entry['surah']:03d}"
    if spec is None:
        return []
    comp, gate = entry["comp"], entry["gate"]
    if comp is None:
        return [f"{label}: no completeness record"]
    failures = []
    if comp["verdict"] != spec["completeness"]:
        failures.append(f"{label}: completeness {comp['verdict']}, expected {spec['completeness']}")
    if "range" in spec:
        got = (comp.get("first_heard_ayah"), comp.get("last_heard_ayah"))
        if got != spec["range"]:
            failures.append(f"{label}: recorded range {list(got)}, expected {list(spec['range'])}")
    wants_gate = "gate" in spec or spec.get("partial")
    if wants_gate and gate is None:
        failures.append(f"{label}: no gate record")
    elif gate is not None:
        if "gate" in spec and gate["verdict"] not in spec["gate"]:
            failures.append(f"{label}: gate {gate['verdict']}, expected {' or '.join(spec['gate'])}")
        if spec.get("partial") and not partial_gate_ok(gate["verdict"]):
            failures.append(f"{label}: partial surah gate {gate['verdict']}, expected one of {PARTIAL_GATE_VERDICTS}")
        for ayah in spec.get("repaired_ayahs", ()):
            if not repaired_ayah(gate.get("repairs", []), entry["surah"], ayah):
                failures.append(f"{label}: {entry['surah']}:{ayah} is not inside an accepted repair")
    return failures


def surah_row(entry: dict) -> dict:
    audio = entry["audio_s"]
    seconds = {k: round(v, 1) for k, v in entry["seconds"].items()}
    total = round(sum(seconds.values()), 1)
    rtf = {k: round(v / audio, 4) for k, v in seconds.items()} if audio else {}
    if audio:
        rtf["total"] = round(total / audio, 4)
    return {
        "reciter": entry["reciter"], "surah": entry["surah"], "audio_s": audio,
        "seconds": {**seconds, "total": total}, "rtf": rtf,
        "completeness": (entry["comp"] or {}).get("verdict"), "gate": (entry["gate"] or {}).get("verdict"),
        "pooled": bool(entry["aligned_here"] and audio),
    }


def pooled_rtf(rows: list[dict]) -> dict:
    """Pooled RTF per stage over the aligned surahs: sum of seconds / sum of audio."""
    used = [r for r in rows if r["pooled"]]
    audio = sum(r["audio_s"] for r in used)
    if not audio:
        return {}
    return {k: round(sum(r["seconds"].get(k, 0) for r in used) / audio, 4) for k in (*STAGES, "total")}


def projected_minutes(rows: list[dict], rtf_total: float, data, tanzil: Path) -> dict:
    """P9: (the reciter's audio / CHUNKS) x (the measured total RTF + EMISSIONS_RTF) + FIXED_OVERHEAD_MIN.

    The reciter's audio is estimated from the Tanzil letters of its listed surahs and the measured audio seconds
    per letter of its complete calibration surahs (all calibration surahs, pooled, when it has none)."""
    weights = ci.surah_weights(tanzil)
    reciters = ci.way2quran_reciters(data)

    def rate(reciter=None):
        complete = [r for r in rows if r["completeness"] == "complete" and r["audio_s"]
                    and (reciter is None or r["reciter"] == reciter)]
        letters = sum(weights[r["surah"]] for r in complete)
        return sum(r["audio_s"] for r in complete) / letters if letters else None

    out = {}
    for rid in PROJECT_RECITERS:
        item = reciters.get(rid)
        per_letter = rate(rid) or rate()
        if item is None or per_letter is None:
            out[str(rid)] = None
            continue
        audio = per_letter * sum(weights[s] for s in ci.way2quran_surah_list(item))
        out[str(rid)] = round(audio / CHUNKS * (rtf_total + EMISSIONS_RTF) / 60 + FIXED_OVERHEAD_MIN, 1)
    return out


def markdown(rows: list[dict], failures: list[str]) -> str:
    lines = ["## Calibration summary (Way2Quran quality)", "",
             "| reciter | surah | completeness | gate | audio s | total s | RTF |", "|---|---|---|---|---|---|---|"]
    for r in rows:
        lines.append(f"| {r['reciter']} | {r['surah']} | {r['completeness']} | {r['gate']} | {r['audio_s']} | "
                     f"{r['seconds'].get('total')} | {r['rtf'].get('total')} |")
    lines += ["", "Result: " + ("PASS" if not failures else "FAIL")]
    lines += [f"- {f}" for f in failures]
    return "\n".join(lines) + "\n"


def evaluate(handoff: Path, reciter: int, surahs: list[int]) -> tuple[list[dict], list[str], list[str]]:
    rows, failures, details = [], [], []
    for surah in surahs:
        entry = load_surah(handoff, reciter, surah)
        failures += check_surah(entry)
        rows.append(surah_row(entry))
        details += [*explain_surah(surah, entry["comp"], entry["gate"], entry["refused"]), ""]
    return rows, failures, details


def cmd_check(args) -> int:
    calibration = ci.calibration_surahs(json.loads(args.calibration.read_text(encoding="utf-8")))
    if args.reciter not in calibration:
        print(f"::error::reciter {args.reciter} is not in the calibration file", file=sys.stderr)
        return 1
    rows, failures, details = evaluate(args.handoff, args.reciter, calibration[args.reciter])
    text = markdown(rows, failures) + "\n" + "\n".join(["## Gate details (Way2Quran quality)", "", *details]).rstrip() + "\n"
    print(text)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as handle:
            handle.write(text)
    if args.out:
        args.out.write_text(json.dumps({"reciter": args.reciter, "surahs": rows, "failures": failures},
                                       indent=2) + "\n", encoding="utf-8")
    for failure in failures:
        print(f"::error::{failure}", file=sys.stderr)
    return 1 if failures else 0


def cmd_combine(args) -> int:
    from recitation_align.quality import tool_version

    calibration = ci.calibration_surahs(json.loads(args.calibration.read_text(encoding="utf-8")))
    folders: dict[int, list[Path]] = {}
    for marker in sorted(args.artifacts.glob("*/chunk-*-*.json")):
        record = json.loads(marker.read_text(encoding="utf-8"))
        folders.setdefault(int(record["reciter"]), []).append(marker.parent)
    rows, failures = [], []
    for reciter, surahs in sorted(calibration.items()):
        if reciter not in folders:
            failures.append(f"reciter {reciter}: no hand-off artifact in {args.artifacts}")
            continue
        for surah in surahs:
            # the surah's records live in the folder of the chunk that held it
            holder = next((f for f in folders[reciter] if (f / "completeness" / f"{surah:03d}.json").is_file()),
                          folders[reciter][0])
            entry = load_surah(holder, reciter, surah)
            failures += check_surah(entry)
            rows.append(surah_row(entry))
    pooled = pooled_rtf(rows)
    data = json.loads(args.data.read_text(encoding="utf-8"))
    projected = projected_minutes(rows, pooled["total"], data, args.tanzil) if pooled else {}
    over = [rid for rid, minutes in projected.items() if minutes is not None and minutes > LIMIT_MIN]
    if not pooled:
        failures.append("no aligned surah: the speed could not be measured")
    doc = {
        "schema": SCHEMA, "run_id": args.run_id, "tool_version": tool_version(), "surahs": rows,
        "rtf": pooled, "projected_chunk_min": projected,
        "assumptions": {"emissions_rtf": EMISSIONS_RTF, "fixed_overhead_min": FIXED_OVERHEAD_MIN,
                        "chunks": CHUNKS, "limit_min": LIMIT_MIN},
        "decision": "ASR_EVERY=6" if over else "ASR_EVERY=4",
        "passed": not failures, "failures": failures,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    print(markdown(rows, failures))
    print(f"pooled RTF {pooled.get('total')}; projected chunk minutes {projected}; decision {doc['decision']}")
    return 1 if failures else 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check", help="assert one reciter's expected outcomes (the workflow step)")
    c.add_argument("--reciter", type=int, required=True)
    c.add_argument("--handoff", type=Path, required=True)
    c.add_argument("--calibration", type=Path, default=CALIBRATION)
    c.add_argument("--out", type=Path, default=None)
    m = sub.add_parser("combine", help="check every reciter of a run's artifacts, project, write ci-calibration.json")
    m.add_argument("--artifacts", type=Path, required=True)
    m.add_argument("--run-id", required=True)
    m.add_argument("--calibration", type=Path, default=CALIBRATION)
    m.add_argument("--data", type=Path, default=WAY2QURAN_DATA)
    m.add_argument("--tanzil", type=Path, default=TANZIL)
    m.add_argument("--out", type=Path, default=OUT)
    args = p.parse_args(argv)
    return cmd_check(args) if args.cmd == "check" else cmd_combine(args)


if __name__ == "__main__":
    sys.exit(main())

"""What is heard inside each stretched word the gate recorded (plan way2quran-quality Q8, ADR 0077). A CI report.

    listen_stretches.py --gate GATE.json --aligned ALIGNED.json --audio FILE --out DIR [--tanzil FILE]

For every word in the gate record's `checks.stretch.words`, the word's span (from the aligned document, plus 0.5 s each
side) is transcribed in windows of at most 20 s, and the heard words are matched against the surah's text:

- `own`: most heard words belong to the stretched word's own ayah (an elongation or a repeat inside it);
- `other`: most belong to one other ayah of the surah (another ayah recited inside this word's span);
- `unknown`: words are heard but most belong to no ayah of the surah (speech, a dua, another surah);
- `silence`: nothing is heard.

Only Way2Quran and MP3Quran audio is run through it (QF audio is not). Writes `listen.json` and `listen.md` in --out.
"""

import argparse
import json
import sys
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOL))

from recitation_align.text import load_tanzil, norm  # noqa: E402

DEFAULT_TANZIL = (TOOL / "../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt").resolve()
MARGIN_S = 0.5
WINDOW_S = 20.0
MAJORITY = 0.6


def classify(heard: str, surah: int, ayah: int, ayahs: dict) -> dict:
    """The class of a heard text against ayah `ayah` of `surah` (word membership on normalised words)."""
    words = norm(heard).split()
    if not words:
        return {"class": "silence", "own_share": None, "other": None}
    sets = {a: set(norm(t).split()) for (s, a), t in ayahs.items() if s == surah}
    own = sum(w in sets.get(ayah, ()) for w in words) / len(words)
    counts = {a: sum(w in ws for w in words) for a, ws in sets.items() if a != ayah}
    best = max(counts, key=lambda a: (counts[a], -abs(a - ayah))) if counts else None
    other = counts[best] / len(words) if best is not None else 0.0
    if own >= MAJORITY and own >= other:
        cls = "own"
    elif other >= MAJORITY:
        cls = "other"
    else:
        cls = "unknown"
    return {"class": cls, "own_share": round(own, 2),
            "other": None if best is None else {"ayah": best, "share": round(other, 2)}}


def windows(start_s: float, end_s: float) -> list[tuple[float, float]]:
    n = max(1, -(-(end_s - start_s) // WINDOW_S))
    step = (end_s - start_s) / n
    return [(round(start_s + i * step, 3), round(start_s + (i + 1) * step, 3)) for i in range(int(n))]


def _span(words: list[dict], ayah: int, position: int, dur_ms: int) -> dict | None:
    cand = [w for w in words if w["ayah"] == ayah and w["position"] == position]
    return min(cand, key=lambda w: abs((w["end_ms"] - w["start_ms"]) - dur_ms)) if cand else None


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--gate", type=Path, required=True)
    ap.add_argument("--aligned", type=Path, required=True)
    ap.add_argument("--audio", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--tanzil", type=Path, default=DEFAULT_TANZIL)
    args = ap.parse_args(argv)

    from recitation_align.audio import load_wav16k
    from recitation_align.transcribe import transcribe_at

    gate = json.loads(args.gate.read_text(encoding="utf-8"))
    doc = json.loads(args.aligned.read_text(encoding="utf-8"))
    ayahs = load_tanzil(args.tanzil)
    surah = gate["surah"]
    stretch = gate["checks"].get("stretch") or {}
    verified = {(e[0], e[1]): "elongation" for e in stretch.get("elongations") or []}
    verified |= {(u[0], u[1]): "unresolved_repeat" for u in stretch.get("unresolved_repeats") or []}
    wav = load_wav16k(args.audio)
    total_s = len(wav) / 16000
    out = []
    for key, position, dur_ms in stretch.get("words") or []:
        ayah = int(key.split(":")[1])
        w = _span(doc["words"], ayah, position, dur_ms)
        row = {"word": key, "position": position, "dur_ms": dur_ms, "gate": verified.get((key, position), "failed")}
        if w is None:
            out.append({**row, "class": None, "note": "not in the aligned document"})
            continue
        a, b = max(0.0, w["start_ms"] / 1000 - MARGIN_S), min(total_s, w["end_ms"] / 1000 + MARGIN_S)
        heard = " ".join(x["text"] for x in transcribe_at(wav, windows(a, b))["windows"])
        out.append({**row, "span_s": [round(a, 2), round(b, 2)], "heard": heard, **classify(heard, surah, ayah, ayahs)})

    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "listen.json").write_text(json.dumps({"surah": surah, "stretches": out}, ensure_ascii=False, indent=1)
                                          + "\n", encoding="utf-8")
    lines = [f"#### Surah {surah}: what the stretched words hold", ""]
    for r in out:
        other = f", ayah {r['other']['ayah']} {r['other']['share']}" if r.get("other") else ""
        lines.append(f"- {r['word']} word {r['position']} ({r['dur_ms'] / 1000:.1f} s, gate: {r['gate']}): "
                     f"**{r.get('class')}** (own {r.get('own_share')}{other}) «{r.get('heard', '')}»")
    (args.out / "listen.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())

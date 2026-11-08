"""The word the app lights, ours against a reference, sampled every 20 ms (plan way2quran-quality Q7f, Q7g, Q7h).

Imported by repeat_calibration.py and recitation_check.py. Standard library only, numbers only: nothing here prints
text or a reference timing.

- `active_word` is the app's rule (apps/mobile/src/features/audio/active-ayah.ts `activeWordPosition`): the time is
  clamped into the ayah, and the lit word is the one that started last (a later segment wins a tie).
- `split` samples every reference ayah from its first word's start to its end and counts, apart for the ayahs the
  reference recites with a repeated position and the others: `nulled` (we light nothing: segments null, no row there or
  the surah ships no timing file), `agrees`, `wrong` (another word lit, or another ayah current).
- `start_errors` is the signed start error (ours minus the reference) of every word of the control ayahs: no repeat in
  the reference, and the same positions as ours one to one.
- `shift_ms` moves our word starts (not the ayah rows), as a client-side offset would.
"""

import statistics

STEP_MS = 20
SHIFTS = list(range(-120, -50, 10))  # Q7h: the lit-word wrong time at shifts -60 to -120


def active_word(segments, start_ms: int, end_ms: int, t: int, shift_ms: int = 0):
    """Position lit at `t` in an ayah [start_ms, end_ms] with `segments` [[position, start, end], ...]; None if none."""
    if not segments:
        return None
    at = min(max(t, start_ms), end_ms)
    best = None
    for seg in segments:
        s = seg[1] + shift_ms
        if s <= at and (best is None or s >= best[1]):
            best = (seg[0], s)
    return None if best is None else best[0]


def is_repeat(words: list[dict]) -> bool:
    return len({w["index"] for w in words}) < len(words)


def _ref_segments(ref: dict) -> list[list[int]]:
    return [[w["index"], w["start_ms"], w["end_ms"]] for w in ref["words"]]


def agreement(ours: list[list[int]], ref: dict, shift_ms: int = 0) -> tuple[int, int]:
    """(samples where our lit word is the reference's, samples) over one reference ayah, both read inside its span."""
    truth, agree, total = _ref_segments(ref), 0, 0
    for t in range(min(w["start_ms"] for w in ref["words"]), ref["end_ms"], STEP_MS):
        total += 1
        agree += active_word(ours, ref["start_ms"], ref["end_ms"], t, shift_ms) == \
            active_word(truth, ref["start_ms"], ref["end_ms"], t)
    return agree, total


def split(rows, refs: list[dict], surah: int, shift_ms: int = 0) -> dict:
    """{"repeat": [nulled, agrees, wrong], "plain": [...]} sample counts. `rows`: our export rows (format 1,
    `verse_key`, `start_ms`, `end_ms`, `segments`), or None when the surah ships no timing file."""
    out = {"repeat": [0, 0, 0], "plain": [0, 0, 0]}
    for ref in refs:
        if not ref["words"]:
            continue
        kind = "repeat" if is_repeat(ref["words"]) else "plain"
        truth = _ref_segments(ref)
        for t in range(min(w["start_ms"] for w in ref["words"]), ref["end_ms"], STEP_MS):
            row = None if rows is None else next((r for r in rows if r["start_ms"] <= t < r["end_ms"]), None)
            if rows is None or (row is not None and row["verse_key"] == f"{surah}:{ref['ayah']}"
                                and row["segments"] is None):
                out[kind][0] += 1
            elif row is None or row["verse_key"] != f"{surah}:{ref['ayah']}":
                out[kind][2] += 1
            else:
                lit = active_word(row["segments"], row["start_ms"], row["end_ms"], t, shift_ms)
                out[kind][1 if lit == active_word(truth, ref["start_ms"], ref["end_ms"], t) else 2] += 1
    return out


def shares(counts: list[int]) -> dict:
    total = sum(counts)
    return {"samples": total, **{k: round(v / total, 4) if total else None
                                 for k, v in zip(("nulled", "agrees", "wrong"), counts)}}


def controls(rows, refs: list[dict], surah: int) -> list[dict]:
    """The control ayahs (Q7h): the reference recites no repeat, and our segments hold the same positions once each."""
    by_key = {r["verse_key"]: r for r in rows or []}
    out = []
    for ref in refs:
        row = by_key.get(f"{surah}:{ref['ayah']}")
        if not ref["words"] or is_repeat(ref["words"]) or row is None or not row["segments"]:
            continue
        positions = [p for p, _, _ in row["segments"]]
        if len(set(positions)) == len(positions) and set(positions) == {w["index"] for w in ref["words"]}:
            out.append(ref)
    return out


def start_errors(rows, refs: list[dict], surah: int) -> list[int]:
    """Signed start errors (ms, ours minus the reference) of the control ayahs' words."""
    by_key = {r["verse_key"]: r for r in rows or []}
    out = []
    for ref in controls(rows, refs, surah):
        ours = {p: s for p, s, _ in by_key[f"{surah}:{ref['ayah']}"]["segments"]}
        out += [ours[w["index"]] - w["start_ms"] for w in ref["words"]]
    return out


def stats(errors: list[int]) -> dict | None:
    if not errors:
        return None
    s = sorted(errors)
    pct = lambda q: s[min(len(s) - 1, int(q * len(s)))]  # noqa: E731
    absolute = sorted(abs(e) for e in errors)
    return {"n": len(s), "median": round(statistics.median(s)), "p10": pct(0.1), "p90": pct(0.9),
            "abs_p90": absolute[min(len(s) - 1, int(0.9 * len(s)))], "early_gt50": round(sum(e < -50 for e in s) / len(s), 3)}


def word_start(rows, refs: list[dict], surah: int, shifts=SHIFTS) -> dict:
    """Q7h's metrics for one surah, over the control ayahs: the signed start error and the lit-word counts at 0 and at
    each shift."""
    ctrl = controls(rows, refs, surah)
    return {"start": stats(start_errors(rows, refs, surah)), "control_ayahs": len(ctrl),
            "lit": {str(s): split(rows, ctrl, surah, s) for s in [0, *shifts]}}


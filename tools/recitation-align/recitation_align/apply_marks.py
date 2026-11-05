"""Apply ear marks: fix ayah starts, then re-align the words inside each fixed span.

Affected ranges. Each marked ayah belongs to its reviewed stretch (`NNN:a-b`), or to itself when no
reviewed stretch holds it. A mark on the first ayah of a range also takes in the ayah before it, because
that ayah must end at the mark. Overlapping or adjacent ranges are merged. Only words inside the ranges
change. Every other word object is kept as it was.

Within a range the fixed starts are the marked ayahs, plus the range's first ayah at its current start.
Each fixed start opens a segment that runs to the next fixed start (the range's last segment runs to the
current start of the ayah after the range). Each segment is aligned on its own emissions with the same
forced aligner and window settings as `run`. Then the words of the range are snapped to audio pauses,
as `run` does (snap_to_pauses, only inside the range). Last, the first word of each fixed ayah starts
exactly at its mark, and the ayah before it is clipped to end there. Basmala words are not re-aligned:
they keep their timings and are clipped to end before the ayah's fixed start.

Frames and milliseconds. The emissions have one row per frame, and `run` converts frames to ms with the
measured duration (duration_ms / frames), not a fixed 20 ms. The same conversion is used here, so a
re-aligned word agrees with the words around it on a long file.
"""

import json
import shutil
from pathlib import Path
from typing import Callable

import torch
import torchaudio.functional as F

from .align import align_emissions, surah_tokens
from .marks import reviewed_ranges, surah_marks
from .repair import ayah_stats, replace_span
from .snap import snap_to_pauses

RANGE_TAIL_MS = 2000  # a range at the end of the surah runs this long past its last ayah's end
BLANK_TOKEN = "<pad>"


def ms_per_frame(duration_ms: int, frames: int) -> float:
    """Measured frame length, as align_full uses it (the audio's length over the emission frames)."""
    if frames <= 0:
        raise ValueError("emissions have no frames")
    return duration_ms / frames


def affected_ranges(ayah_list: list[int], marks: dict[int, int], reviewed: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """Merged (first, last) ayah ranges to re-align for the marks of one surah."""
    index = {a: i for i, a in enumerate(ayah_list)}
    spans = []
    for a in sorted(marks):
        if a not in index:
            raise ValueError(f"marked ayah {a} is not in the surah")
        lo, hi = next(((l, h) for l, h in reviewed if l <= a <= h), (a, a))
        if a == lo and index.get(lo, 0) > 0:
            lo = ayah_list[index[lo] - 1]  # the ayah before the mark must end at the mark
        spans.append((lo, hi))
    merged: list[tuple[int, int]] = []
    for lo, hi in sorted(spans):
        if merged and lo <= merged[-1][1] + 1:
            merged[-1] = (merged[-1][0], max(merged[-1][1], hi))
        else:
            merged.append((lo, hi))
    return merged


def _entry(orig: dict, start: int, end: int, conf: float) -> dict:
    """A word in the same key order align_full writes (basmala, when present, comes last)."""
    e = {"surah": orig["surah"], "ayah": orig["ayah"], "position": orig["position"], "word": orig["word"],
         "start_ms": start, "end_ms": end, "confidence": conf}
    if "basmala" in orig:
        e["basmala"] = orig["basmala"]
    return e


def realign_range(words: list[dict], *, surah: int, ayahs: dict, lo: int, hi: int, marks: dict[int, int],
                  em: torch.Tensor, mpf: float, vocab: dict, forced_align_fn, settings: dict,
                  pauses: list[tuple[float, float]] | None = None) -> list[dict]:
    """New word entries for ayahs lo..hi (sorted by ayah and position), with the marks applied.

    `mpf` is the measured ms per emission frame. `pauses` are (start, end) in seconds, as cached_pauses
    returns them; None or empty skips the snapping step.
    """
    stats = ayah_stats(words)
    if lo not in stats:
        raise ValueError(f"ayah {lo} has no aligned words")
    fixed = {a: ms for a, ms in marks.items() if lo <= a <= hi}
    fixed.setdefault(lo, stats[lo]["start_ms"])
    keys = sorted(fixed)
    for prev, cur in zip(keys, keys[1:]):
        if fixed[cur] <= fixed[prev]:
            raise ValueError(f"marks are not in order: ayah {cur} starts before ayah {prev}")
    end_ms = stats[hi + 1]["start_ms"] if hi + 1 in stats else stats[hi]["end_ms"] + RANGE_TAIL_MS
    if fixed[keys[-1]] >= end_ms:
        raise ValueError(f"mark for ayah {keys[-1]} is not before the next ayah's start")

    orig_in = [w for w in words if lo <= w["ayah"] <= hi]
    sw, tokens, wot, aoww = surah_tokens(surah, ayahs, lo, hi, False, vocab)
    blank = vocab.get(BLANK_TOKEN, 0)
    new: dict[tuple[int, int], dict] = {}
    for idx, a0 in enumerate(keys):
        a1 = keys[idx + 1] if idx + 1 < len(keys) else hi + 1
        seg_end = fixed[keys[idx + 1]] if idx + 1 < len(keys) else end_ms
        f0 = round(fixed[a0] / mpf)
        f1 = min(round(seg_end / mpf), em.shape[0])
        if f1 <= f0:
            raise ValueError(f"segment for ayah {a0} has no audio")
        idxs = [i for i, a in enumerate(aoww) if a0 <= a < a1]
        if not idxs:
            continue
        first, last = idxs[0], idxs[-1] + 1
        tok_idx = [t for t, wi in enumerate(wot) if first <= wi < last]
        if not tok_idx:
            continue
        agg = align_emissions(
            em[f0:f1], [tokens[t] for t in tok_idx], [wot[t] - first for t in tok_idx], aoww[first:last],
            blank, leading_star=False, forced_align_fn=forced_align_fn, **settings)
        for li, r in agg.items():
            ayah_no, pos, _, _ = sw[first + li]
            new[(ayah_no, pos)] = {
                "start": round((r["start"] + f0) * mpf),
                "end": round((r["end"] + 1 + f0) * mpf),
                "conf": round(sum(r["score"]) / len(r["score"]), 3),
            }

    expected = {(w["ayah"], w["position"]) for w in orig_in if not w.get("basmala")}
    if set(new) != expected:
        raise ValueError(f"re-aligned words of ayahs {lo}-{hi} do not match the file "
                         f"({len(new)} aligned, {len(expected)} expected)")

    out: list[dict] = []
    for w in orig_in:
        if w.get("basmala"):
            cut = fixed.get(w["ayah"])
            if cut is not None and w["end_ms"] > cut:
                out.append(_entry(w, min(w["start_ms"], cut), cut, w["confidence"]))
            else:
                out.append(w)
            continue
        r = new[(w["ayah"], w["position"])]
        out.append(_entry(w, r["start"], r["end"], r["conf"]))

    if pauses:  # the same snapping run applies at ayah boundaries, limited to this range
        snap_to_pauses(out, pauses)

    for a in keys:  # the fixed starts win over snapping: the first word of a marked ayah starts at its mark
        ws = sorted((w for w in out if w["ayah"] == a and not w.get("basmala")), key=lambda w: w["position"])
        if ws:
            ws[0]["start_ms"] = fixed[a]
            ws[0]["end_ms"] = max(ws[0]["end_ms"], fixed[a])
        if a - 1 >= lo:  # the ayah before ends at the mark (it is inside the range, see affected_ranges)
            prev_ws = sorted((w for w in out if w["ayah"] == a - 1 and not w.get("basmala")),
                             key=lambda w: w["position"])
            if prev_ws:
                last_w = prev_ws[-1]
                last_w["end_ms"] = min(last_w["end_ms"], fixed[a])
                last_w["start_ms"] = min(last_w["start_ms"], last_w["end_ms"])
    return sorted(out, key=lambda w: (w["ayah"], w["position"]))


def apply_surah_marks(words: list[dict], *, surah: int, ayahs: dict, marks: dict[int, int],
                      reviewed: list[tuple[int, int]], em: torch.Tensor, mpf: float, vocab: dict,
                      forced_align_fn=F.forced_align, settings: dict,
                      pauses: list[tuple[float, float]] | None = None) -> tuple[list[dict], list[tuple[int, int]]]:
    """Words with the marks applied. Returns (words, the ranges that were re-aligned)."""
    ayah_list = sorted({a for s, a in ayahs if s == surah})
    ranges = affected_ranges(ayah_list, marks, reviewed)
    for lo, hi in ranges:
        entries = realign_range(words, surah=surah, ayahs=ayahs, lo=lo, hi=hi, marks=marks, em=em, mpf=mpf,
                                vocab=vocab, forced_align_fn=forced_align_fn, settings=settings, pauses=pauses)
        words = replace_span(words, lo, hi, entries)
    return words, ranges


def manual_marks_list(marks: dict[int, int]) -> list[dict]:
    return [{"ayah": a, "start_ms": ms} for a, ms in sorted(marks.items())]


def apply_to_surah(data: dict, *, ayahs: dict, marks: dict[int, int], reviewed: list[tuple[int, int]],
                   em: torch.Tensor, vocab: dict, forced_align_fn=F.forced_align, settings: dict,
                   pauses: list[tuple[float, float]] | None = None) -> tuple[dict, list]:
    """A copy of one surah file with the marks applied and `manual_marks` recorded at the top level."""
    mpf = ms_per_frame(data["audio"]["duration_ms"], em.shape[0])
    words, ranges = apply_surah_marks(data["words"], surah=data["surah"], ayahs=ayahs, marks=marks,
                                      reviewed=reviewed, em=em, mpf=mpf, vocab=vocab,
                                      forced_align_fn=forced_align_fn, settings=settings, pauses=pauses)
    out = dict(data)
    out["words"] = words
    out["manual_marks"] = manual_marks_list(marks)
    return out, ranges


def apply_marks_dir(src: Path, out: Path, marks: dict, *, ayahs: dict,
                    emissions_for: Callable[[int], torch.Tensor], vocab: dict,
                    pauses_for: Callable[[int], list] | None = None,
                    forced_align_fn=F.forced_align, settings: dict) -> dict:
    """Write every surah file of `src` to `out`.

    Surahs without marks are copied byte for byte. A surah whose re-alignment fails is also copied
    unchanged and listed under "failed" with the reason, so the batch never stops half way.
    """
    if src.resolve() == out.resolve():
        raise ValueError("apply-marks needs a separate output folder")
    out.mkdir(parents=True, exist_ok=True)
    summary: dict = {"surahs": 0, "copied": 0, "changed": 0, "marks": 0, "ranges": 0, "missing": [], "failed": []}
    marked = {s for s in range(1, 115) if surah_marks(marks, s)}
    present = set()
    for path in sorted(src.glob("[0-9][0-9][0-9].json")):
        surah = int(path.stem)
        present.add(surah)
        summary["surahs"] += 1
        sm = surah_marks(marks, surah)
        if not sm:
            shutil.copyfile(path, out / path.name)
            summary["copied"] += 1
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            new, ranges = apply_to_surah(
                data, ayahs=ayahs, marks=sm, reviewed=reviewed_ranges(marks, surah), em=emissions_for(surah),
                vocab=vocab, forced_align_fn=forced_align_fn, settings=settings,
                pauses=pauses_for(surah) if pauses_for else None)
        except (ValueError, RuntimeError) as exc:
            shutil.copyfile(path, out / path.name)
            summary["failed"].append({"surah": surah, "error": str(exc)[:300]})
            continue
        (out / path.name).write_text(json.dumps(new, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        summary["changed"] += 1
        summary["marks"] += len(sm)
        summary["ranges"] += len(ranges)
    summary["missing"] = sorted(marked - present)
    return summary

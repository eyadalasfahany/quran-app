"""Completeness of one Way2Quran surah file (ADR 0077 decision 2, plan way2quran-quality Q2).

The file's opening and ending are listened for with the ASR in 30 s windows that start at the first sound and
end at the last sound. A unique 6 to 24 word key is built from the Tanzil text for each end; the key counts as
heard when `partial_ratio` against the transcript reaches `KEY_PASS`. Keys and transcripts are compared as
`text.norm` copies only; the Quran text itself is never changed and no Quran text is written in this module.

The ASR is injected as `transcribe_windows(windows) -> list[str]` (the script wires it to
`transcribe.cached_transcribe_at`), so this module imports no model.

The record keeps `first_heard_ayah` / `last_heard_ayah` as the recorded range of the file (ADR 0077 amendment of
7 Nov 2026): the first ayah is 1 when the opening key is heard, the last is the surah's final ayah when the ending
key is heard, and otherwise they come from the ayah heads and tails heard in the head and tail windows.
`recorded_range(record)` gives `(first, last)` when both are known.
"""

import time
from statistics import median

import numpy as np
from rapidfuzz import fuzz

from .models import ASR_MODEL, ASR_REVISION, SAMPLE_RATE
from .quality import PARAMS, tool_version
from .report import SCHEMA, validate_completeness
from .text import norm

CHECK_VERSION = "completeness-1"
WINDOW_S = 30
AYAH_HIT = 85  # an ayah head or tail counts as heard at this partial_ratio (not in PARAMS: a diagnostic)
AYAH_WORDS = 5  # words of an ayah head or tail that are matched
AYAH_MIN_CHARS = 12  # shorter heads (the disjoined letters) are too weak to match
TIE_CHARS = 5  # two matches this close are the same place in the transcript
FRAME = SAMPLE_RATE // 10  # 100 ms


def check_string() -> str:
    return f"{CHECK_VERSION}|{ASR_MODEL}@{ASR_REVISION}"


# --- keys ---------------------------------------------------------------------------------------------

def _basmala(ayahs: dict) -> str:
    return norm(ayahs[(1, 1)])


def surah_words(surah: int, ayahs: dict) -> list[tuple[int, str]]:
    """(ayah, normalised word) in order. The basmala is stripped from ayah 1 except in surahs 1 and 9."""
    basmala = _basmala(ayahs)
    out: list[tuple[int, str]] = []
    for (s, a), text in sorted(ayahs.items()):
        if s != surah:
            continue
        words = norm(text)
        if a == 1 and surah not in (1, 9) and words.startswith(basmala):
            words = words[len(basmala):].strip()
        out += [(a, w) for w in words.split()]
    return out


def _key(surah: int, ayahs: dict, from_end: bool) -> tuple[str, int, float]:
    """(key text, word count, self-similarity): the shortest span that matches nowhere else in the surah."""
    texts = [w for _, w in surah_words(surah, ayahs)]
    sim = 0.0
    last_k = 0
    for k in PARAMS["KEY_WORDS"]:
        if k >= len(texts):
            return " ".join(texts), len(texts), 0.0
        span = texts[-k:] if from_end else texts[:k]
        rest = texts[:-k] if from_end else texts[k:]
        sim = fuzz.partial_ratio(" ".join(span), " ".join(rest)) if rest else 0.0
        last_k = k
        if sim < PARAMS["KEY_UNIQUE"]:
            return " ".join(span), k, sim
    span = texts[-last_k:] if from_end else texts[:last_k]
    return " ".join(span), last_k, sim


def opening_key(surah: int, ayahs: dict) -> str:
    return _key(surah, ayahs, False)[0]


def ending_key(surah: int, ayahs: dict) -> str:
    return _key(surah, ayahs, True)[0]


def key_selfsim(surah: int, ayahs: dict, *, from_end: bool) -> float:
    """How well the key matches the rest of the surah. Below `KEY_UNIQUE` the key is unique."""
    return _key(surah, ayahs, from_end)[2]


# --- sound and windows --------------------------------------------------------------------------------

def sound_bounds(wav: np.ndarray) -> tuple[float, float]:
    """(first_s, last_s): the first and last 100 ms frame whose RMS is above `SOUND_DB`. (0, 0) for silence."""
    n = len(wav) // FRAME
    if n == 0:
        return 0.0, 0.0
    rms = np.sqrt((wav[: n * FRAME].reshape(n, FRAME).astype(np.float64) ** 2).mean(axis=1) + 1e-12)
    loud = np.nonzero(20 * np.log10(rms) > PARAMS["SOUND_DB"])[0]
    if len(loud) == 0:
        return 0.0, 0.0
    return round(loud[0] * 0.1, 1), round((loud[-1] + 1) * 0.1, 1)


def _w(start: float, end: float) -> tuple[float, float]:
    return round(float(start), 3), round(float(end), 3)


def head_windows(first_s: float, end_s: float | None = None) -> list[tuple[float, float]]:
    """30 s windows forward from the first sound, up to `HEAD_CAP_S`. A window is cut at `end_s` and dropped
    when less than a second of it is left."""
    out = []
    for k in range(PARAMS["HEAD_CAP_S"] // WINDOW_S):
        lo, hi = first_s + k * WINDOW_S, first_s + (k + 1) * WINDOW_S
        if end_s is not None:
            hi = min(hi, end_s)
        if hi - lo < 1.0:
            break
        out.append(_w(lo, hi))
    return out


def tail_windows(last_s: float) -> list[tuple[float, float]]:
    """30 s windows backward from the last sound, up to `TAIL_CAP_S`; the last one is cut at the file start."""
    out = []
    for k in range(PARAMS["TAIL_CAP_S"] // WINDOW_S):
        hi = last_s - k * WINDOW_S
        if hi < 1.0:
            break
        lo = max(0.0, hi - WINDOW_S)
        out.append(_w(lo, hi))
        if lo <= 0.0:
            break
    return out


# --- matching -----------------------------------------------------------------------------------------

def _join(texts: list[str]) -> tuple[str, list[tuple[int, int]]]:
    """Normalise each window text, join with one space, and return each window's (start, end) character span."""
    parts = [norm(t) for t in texts]
    spans, pos = [], 0
    for p in parts:
        spans.append((pos, pos + len(p)))
        pos += len(p) + 1
    return " ".join(parts), spans


def _seconds(index: int, spans: list[tuple[int, int]], windows: list[tuple[float, float]]) -> float:
    """Transcript character offset to seconds, assuming even pace inside a window."""
    for (a, b), (lo, hi) in zip(spans, windows):
        if index <= b:
            if b <= a:
                return lo
            return lo + (hi - lo) * (max(index, a) - a) / (b - a)
    return windows[-1][1]


def match_key(texts: list[str], windows: list[tuple[float, float]], key: str) -> tuple[float, float | None, float | None]:
    """(score, start_s, end_s) of the best `partial_ratio` match of `key` in the windows' transcript."""
    joined, spans = _join(texts)
    if not joined or not key:
        return 0.0, None, None
    al = fuzz.partial_ratio_alignment(key, joined)
    if al is None:
        return 0.0, None, None
    return float(al.score), _seconds(al.dest_start, spans, windows), _seconds(al.dest_end, spans, windows)


def ending_at(texts: list[str], windows: list[tuple[float, float]], key: str) -> float | None:
    """Seconds (in the file) where the ending key ends, or None when it is not heard."""
    score, _, end_s = match_key(texts, windows, key)
    return round(end_s, 1) if score >= PARAMS["KEY_PASS"] and end_s is not None else None


def _ayah_spans(surah: int, ayahs: dict, *, tail: bool) -> dict[int, str]:
    by_ayah: dict[int, list[str]] = {}
    for a, w in surah_words(surah, ayahs):
        by_ayah.setdefault(a, []).append(w)
    out = {}
    for a, words in by_ayah.items():
        t = " ".join(words[-AYAH_WORDS:] if tail else words[:AYAH_WORDS])
        if len(t) >= AYAH_MIN_CHARS:
            out[a] = t
    return out


def _hits(text: str, spans: dict[int, str]) -> dict[int, list[tuple[int, int]]]:
    """Every place (start, end) in `text` where an ayah's head or tail matches at score >= 85, in order."""
    hits: dict[int, list[tuple[int, int]]] = {}
    for a, t in spans.items():
        pos = 0
        while pos < len(text):
            al = fuzz.partial_ratio_alignment(t, text[pos:])
            if al is None or al.score < AYAH_HIT:
                break
            hits.setdefault(a, []).append((pos + al.dest_start, pos + al.dest_end))
            pos += max(al.dest_end, 1)
    return hits


def heard_ayahs(text: str, surah: int, ayahs: dict) -> tuple[int | None, int | None]:
    """(first, last) ayah whose 5-word head (first) or tail (last) is in `text` at score >= 85.

    Give the head windows' text for the first and the tail windows' text for the last. The first is the ayah
    whose head is heard earliest in the text, the last the one whose tail is heard latest, so a lookalike
    phrase elsewhere in the surah cannot widen the range. Where several ayahs match the same place (a
    refrain) the first is the one whose next ayah's head follows it and the last the one whose previous ayah's
    tail precedes it; with no such evidence the narrower range wins (the later first, the earlier last).
    """
    text = norm(text)
    heads = _hits(text, _ayah_spans(surah, ayahs, tail=False))
    tails = _hits(text, _ayah_spans(surah, ayahs, tail=True))
    first = last = None
    if heads:
        lo = min(o[0] for occ in heads.values() for o in occ)
        tied = sorted(a for a, occ in heads.items() if any(o[0] - lo <= TIE_CHARS for o in occ))
        first = next(
            (a for a in tied if any(n[0] > heads[a][0][0] for n in heads.get(a + 1, []))), tied[-1]
        )
    if tails:
        hi = max(o[1] for occ in tails.values() for o in occ)
        tied = sorted((a for a, occ in tails.items() if any(hi - o[1] <= TIE_CHARS for o in occ)), reverse=True)
        last = next(
            (a for a in tied if any(p[1] < tails[a][-1][1] for p in tails.get(a - 1, []))), tied[-1]
        )
    return first, last


# --- the check ----------------------------------------------------------------------------------------

def _norm_windows(shared_texts) -> dict[tuple[float, float], str]:
    return {_w(*k): v for k, v in (shared_texts or {}).items()}


def _letters(surah: int, ayahs: dict, first: int, last: int) -> int:
    return sum(len(w) for a, w in surah_words(surah, ayahs) if first <= a <= last)


def check_file(
    wav: np.ndarray,
    surah: int,
    ayahs: dict,
    sha256: str,
    size_bytes: int,
    transcribe_windows,
    *,
    shared_texts: dict | None = None,
    file: str | None = None,
    source_last_modified: str | None = None,
) -> dict:
    """The completeness record of one file (plan Data and report formats). `wav` is the whole file at 16 kHz.

    `shared_texts` maps (start_s, end_s) to text for windows already transcribed (the anchors' schedule);
    only the other windows are passed to `transcribe_windows`, one call each, and counted in `asr_calls_extra`.
    """
    t0 = time.perf_counter()
    shared = _norm_windows(shared_texts)
    first_s, last_s = sound_bounds(wav)
    open_text, open_words, _ = _key(surah, ayahs, False)
    end_text, end_words, _ = _key(surah, ayahs, True)
    n_ayahs = max(a for a, _ in surah_words(surah, ayahs))
    extra = 0

    def text_of(window: tuple[float, float]) -> str:
        nonlocal extra
        if window not in shared:
            shared[window] = transcribe_windows([window])[0]
            extra += 1
        return shared[window]

    # head: forward from the first sound until the opening is heard
    h_windows, h_texts, h_scores = [], [], []
    open_heard, open_at = False, None
    for w in head_windows(first_s, last_s):
        h_windows.append(w)
        h_texts.append(text_of(w))
        score, start, _ = match_key(h_texts, h_windows, open_text)
        h_scores.append(round(score, 1))
        if score >= PARAMS["KEY_PASS"]:
            open_heard, open_at = True, start
            break

    # tail: backward from the last sound until the ending is heard
    t_windows, t_texts, t_scores = [], [], []
    end_heard, end_at = False, None
    for w in tail_windows(last_s):
        t_windows.insert(0, w)
        t_texts.insert(0, text_of(w))
        score, _, stop = match_key(t_texts, t_windows, end_text)
        t_scores.append(round(score, 1))
        if score >= PARAMS["KEY_PASS"]:
            end_heard, end_at = True, stop
            break

    first_seen, _ = heard_ayahs(" ".join(h_texts), surah, ayahs)
    _, last_seen = heard_ayahs(" ".join(t_texts), surah, ayahs)
    first_ayah = 1 if open_heard else first_seen
    last_ayah = n_ayahs if end_heard else last_seen

    if open_heard and end_heard:
        verdict = "complete"
    elif open_heard:
        verdict = "incomplete-end"
    elif end_heard:
        verdict = "incomplete-start"
    elif first_seen is not None or last_seen is not None:
        verdict = "incomplete-both"
    else:
        verdict = "unverified"
    if verdict == "unverified":
        first_ayah = last_ayah = None

    ms_per_letter = None
    if first_ayah is not None and last_ayah is not None and first_ayah <= last_ayah and last_s > first_s:
        letters = _letters(surah, ayahs, first_ayah, last_ayah)
        if letters:
            ms_per_letter = round((last_s - first_s) * 1000 / letters)

    ending_s = round(end_at, 1) if end_at is not None else None
    record = {
        "schema": SCHEMA,
        "surah": surah,
        "file": file or f"{surah:03d}.mp3",
        "sha256": sha256,
        "bytes": size_bytes,
        "duration_ms": round(len(wav) * 1000 / SAMPLE_RATE),
        "source_last_modified": source_last_modified,
        "first_sound_s": first_s,
        "last_sound_s": last_s,
        "opening": {"words": open_words, "scores": h_scores, "heard": open_heard,
                    "at_s": round(open_at, 1) if open_at is not None else None},
        "ending": {"words": end_words, "scores": t_scores, "heard": end_heard,
                   "at_s": ending_s},
        "first_heard_ayah": first_ayah,
        "last_heard_ayah": last_ayah,
        "ayah_count": n_ayahs,
        "ending_at_s": ending_s,
        "trailing_s": round(last_s - ending_s, 1) if ending_s is not None else None,
        "windows": {"head": len(h_windows), "tail": len(t_windows)},
        "asr_calls_extra": extra,
        "ms_per_letter": ms_per_letter,
        "verdict": verdict,
        "check": check_string(),
        "tool_version": tool_version(),
        "seconds": round(time.perf_counter() - t0, 1),
    }
    validate_completeness(record)
    return record


def recorded_range(record: dict) -> tuple[int, int] | None:
    """(first_ayah, last_ayah) the file holds, or None when it is not known (ADR 0077 amendment, Q11b)."""
    first, last = record.get("first_heard_ayah"), record.get("last_heard_ayah")
    if record.get("verdict") == "unverified" or first is None or last is None or first > last:
        return None
    return first, last


def duration_flags(records: list[dict]) -> dict[int, list[str]]:
    """{surah: ["suspect-duration"]} for complete files whose ms_per_letter is below `DURATION_FLAG` times the
    median of the complete files. A flag never excludes a surah."""
    complete = [r for r in records if r["verdict"] == "complete" and r.get("ms_per_letter")]
    if not complete:
        return {}
    med = median(r["ms_per_letter"] for r in complete)
    return {r["surah"]: ["suspect-duration"] for r in complete if r["ms_per_letter"] < PARAMS["DURATION_FLAG"] * med}

"""Completeness of one Way2Quran surah file (ADR 0077 decision 2, plan way2quran-quality Q2).

The file's opening and ending are listened for with the ASR in 30 s windows that start at the first sound and
end at the last sound. A unique 6 to 24 word key is built from the Tanzil text for each end; the key counts as
heard when its score (`key_score`) against the transcript reaches `KEY_PASS`. Keys and transcripts are compared as
`text.norm` copies only; the Quran text itself is never changed and no Quran text is written in this module.

The ASR is injected as `transcribe_windows(windows) -> list[str]` (the script wires it to
`transcribe.cached_transcribe_at`), so this module imports no model.

The record keeps `first_heard_ayah` / `last_heard_ayah` as the recorded range of the file (ADR 0077 amendment of
7 Nov 2026): the first ayah is 1 when the opening key is heard, the last is the surah's final ayah when the ending
key is heard, and otherwise they come from the ayah heads and tails heard in the head and tail windows.
`recorded_range(record)` gives `(first, last)` when both are known.

The end probe (plan Q2b). The ASR stops after `MAX_NEW_TOKENS` tokens, and a fast reciter fills a 30 s window
with more than that, so the transcript of a window loses its last seconds. The tail windows end at the last
sound, so the lost seconds are the surah's ending: a complete file then fails its ending key (MP3Quran moshaf 62,
surah 17). When the first tail window does not pass, the last `PROBE_SPAN_S` seconds are transcribed again in
two overlapping `PROBE_S` windows, short enough to stay under the cap, and the ending key is matched in their
text at the same `KEY_PASS`. The key is unique in the surah, so a file that stops early still fails. The probe
windows are recorded in `ending.probe`; `windows.tail` still counts the 30 s tail windows only. The head probe does
the same for the opening (an ASR repetition loop or an early stop on the disjoined letters loses window 0).

The key score (Q2b) is the lowest of three numbers, so a pass rests on most of the key being heard:
- `partial_ratio` of the key in the transcript;
- coverage: the key characters found, in order (longest common subsequence), in the matched span, as a
  percentage of the key (less the outer word the edge lets go, when it is lost). A transcript of a few letters found inside the
  key scores a few percent, not 100;
- the edge: how much of the key's outer end (the end of the ending key, the start of the opening key) lies
  beyond the outermost run of `EDGE_RUN` or more matched characters. One outer word may be lost (the ASR drops a word in a long madd or a fade); every
  character beyond it costs `100 / len(outer word)`, so a transcript that stops two words before the key's end
  fails even when the key is long.
A surah whose ayah 1 (or ayahs 1 and 2) is only the disjoined letters also has an opening key that starts after
them (`LETTERS_AYAHS`); the opening is heard when either key passes. The ASR often renders the letters alone, or
loops on them.
"""

import time
from statistics import median

import numpy as np
from rapidfuzz import fuzz
from rapidfuzz.distance import LCSseq

from .models import ASR_MODEL, ASR_REVISION, SAMPLE_RATE
from .quality import PARAMS, tool_version
from .report import SCHEMA, validate_completeness
from .text import norm

CHECK_VERSION = "completeness-2"
WINDOW_S = 30
AYAH_HIT = 85  # an ayah head or tail counts as heard at this partial_ratio (not in PARAMS: a diagnostic)
AYAH_WORDS = 5  # words of an ayah head or tail that are matched
AYAH_MIN_CHARS = 12  # shorter heads (the disjoined letters) are too weak to match
TIE_CHARS = 5  # two matches this close are the same place in the transcript
FRAME = SAMPLE_RATE // 10  # 100 ms
PROBE_S = 16  # one probe window: about half the words of a 30 s window, well under the ASR token cap
PROBE_SPAN_S = 30  # a probe covers 30 s, as the first head or tail window does, in three overlapping windows
PROBE_BELOW = 90  # the first head or tail window is probed when its key score is below this (a pass under 90 is thin)
LONG_KEY = 2  # the long form of a key has this many times its words (capped at the surah)
EDGE_RUN = 3  # the edge is where the last (first) run of at least this many matched characters ends (starts)
PAUSE_S = 0.3  # a pause in the opening: at least this long below `SOUND_DB`
PAUSE_PROBES = 3  # head-probe windows that start at a pause in the first `PROBE_SPAN_S - PROBE_S` seconds
# Surahs whose first ayah (42: first two) is only the disjoined letters; ayah numbers, no text.
LETTERS_AYAHS = {s: 1 for s in (2, 3, 7, 19, 20, 26, 28, 29, 30, 31, 32, 36, 40, 41, 43, 44, 45, 46)} | {42: 2}


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


def _key(surah: int, ayahs: dict, from_end: bool, skip: int = 0) -> tuple[str, int, float]:
    """(key text, word count, self-similarity): the shortest span that matches nowhere else in the surah.
    `skip` leaves out the first `skip` ayahs (the letters-only opening key)."""
    texts = [w for a, w in surah_words(surah, ayahs) if a > skip]
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


def letters_key(surah: int, ayahs: dict) -> tuple[str, int, float] | None:
    """The opening key that starts after a letters-only first ayah (`LETTERS_AYAHS`), or None for other surahs."""
    skip = LETTERS_AYAHS.get(surah)
    return _key(surah, ayahs, False, skip) if skip else None


def key_set(surah: int, ayahs: dict, *, from_end: bool) -> list[tuple[str, bool]]:
    """(key, may lose its outer word) pairs an end is heard by: the key, then the same end at twice its words
    (`LONG_KEY`; one misheard or repeated word costs a long key half as much), and for the opening the letters key
    and its long form too. Every key may lose its outer word: the ASR also mishears the word after the letters
    as part of them, so a letters surah's opening is heard without the letters and at most one more word."""
    out = []
    skips = [0] + ([LETTERS_AYAHS[surah]] if not from_end and surah in LETTERS_AYAHS else [])
    for skip in skips:
        key, k, _ = _key(surah, ayahs, from_end, skip)
        texts = [w for a, w in surah_words(surah, ayahs) if a > skip]
        n = min(len(texts), LONG_KEY * k)
        long_key = " ".join(texts[-n:] if from_end else texts[:n])
        out += [(key, True)] + ([(long_key, True)] if long_key != key else [])
    return list(dict.fromkeys(out))


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


def _probe(lo_s: float, first_s: float, last_s: float) -> list[tuple[float, float]]:
    out = []
    step = (PROBE_SPAN_S - PROBE_S) / 2
    for k in range(3):
        lo, hi = max(first_s, lo_s + k * step), min(last_s, lo_s + k * step + PROBE_S)
        if hi - lo >= 1.0 and _w(lo, hi) not in out:
            out.append(_w(lo, hi))
    return out


def probe_windows(last_s: float, first_s: float = 0.0) -> list[tuple[float, float]]:
    """The end probe, in time order: three `PROBE_S` windows from `last_s - PROBE_SPAN_S` to `last_s`, overlapping
    so that no word is lost at a seam. Cut at `first_s`; a window under a second is dropped."""
    return _probe(last_s - PROBE_SPAN_S, first_s, last_s)


def head_probe_windows(first_s: float, last_s: float, pauses: list[float] | None = None) -> list[tuple[float, float]]:
    """The head probe: the same three windows over the first `PROBE_SPAN_S` seconds from `first_s`, cut at
    `last_s`, then a `PROBE_S` window from each of the first `PAUSE_PROBES` pause ends in `pauses` (seconds) up to
    `first_s + PROBE_SPAN_S - PROBE_S`. The ASR stops or loops on disjoined letters at a window's start, and a
    window that starts at the pause after them hears the next ayah."""
    out = _probe(first_s, first_s, last_s)
    later = [p for p in (pauses or []) if first_s + 1.0 <= p <= first_s + PROBE_SPAN_S - PROBE_S]
    for p in later[:PAUSE_PROBES]:
        w = _w(p, min(last_s, p + PROBE_S))
        if w[1] - w[0] >= 1.0 and w not in out:
            out.append(w)
    return out


def opening_pauses(wav: np.ndarray, first_s: float) -> list[float]:
    """End times (s) of the pauses (`PAUSE_S` or longer below `SOUND_DB`) after `first_s`, in the first
    `PROBE_SPAN_S` seconds."""
    lo = int(first_s * 10)
    seg = wav[lo * FRAME: (lo + PROBE_SPAN_S * 10) * FRAME]
    n = len(seg) // FRAME
    if n == 0:
        return []
    rms = np.sqrt((seg[: n * FRAME].reshape(n, FRAME).astype(np.float64) ** 2).mean(axis=1) + 1e-12)
    quiet = 20 * np.log10(rms) <= PARAMS["SOUND_DB"]
    out, run = [], 0
    for i, q in enumerate(quiet):
        if q:
            run += 1
            continue
        if run * 0.1 >= PAUSE_S - 1e-9:
            out.append(round((lo + i) * 0.1, 1))
        run = 0
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


def key_score(key: str, text: str, *, from_end: bool, lose_outer: bool = True) -> tuple[float, int, int]:
    """(score, start, end) of `key` in the normalised `text`: the lowest of the `partial_ratio`, the coverage and the
    edge score (module docstring); start and end are the matched span's character offsets in `text`."""
    if not text or not key:
        return 0.0, 0, 0
    al = fuzz.partial_ratio_alignment(key, text)
    if al is None:
        return 0.0, 0, 0
    span = text[al.dest_start:al.dest_end]
    runs = [(op.src_start, op.src_end) for op in LCSseq.opcodes(key, span) if op.tag == "equal"]
    solid = [(a, b) for a, b in runs if b - a >= EDGE_RUN]  # stray single letters do not mark the edge as heard
    if not solid:
        return 0.0, al.dest_start, al.dest_end
    words = key.split()
    outer = words[-1] if from_end else words[0]
    unmatched = len(key) - solid[-1][1] if from_end else solid[0][0]
    allowed = len(outer) + 1 if lose_outer else 0
    excess = max(0, unmatched - allowed)
    edge = max(0.0, 100.0 * (1 - excess / (len(outer) + 1)))
    # the one outer word the edge lets go is not counted against the coverage either
    cover = 100.0 * min(1.0, sum(b - a for a, b in runs) / (len(key) - min(unmatched, allowed)))
    return min(float(al.score), cover, edge), al.dest_start, al.dest_end


def match_key(texts: list[str], windows: list[tuple[float, float]], key: str, *,
              from_end: bool, lose_outer: bool = True) -> tuple[float, float | None, float | None]:
    """(score, start_s, end_s) of `key` in the windows' transcript (`key_score`)."""
    joined, spans = _join(texts)
    score, start, end = key_score(key, joined, from_end=from_end, lose_outer=lose_outer)
    if not score:
        return 0.0, None, None
    return score, _seconds(start, spans, windows), _seconds(end, spans, windows)


def ending_at(texts: list[str], windows: list[tuple[float, float]], key: str) -> float | None:
    """Seconds (in the file) where the ending key ends, or None when it is not heard."""
    score, _, end_s = match_key(texts, windows, key, from_end=True)
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
    only the other windows are passed to `transcribe_windows`, one call each, and counted in `asr_calls_extra`
    (the end probe's windows too).
    """
    t0 = time.perf_counter()
    shared = _norm_windows(shared_texts)
    first_s, last_s = sound_bounds(wav)
    open_text, open_words, _ = _key(surah, ayahs, False)
    l_key = letters_key(surah, ayahs)
    open_keys = key_set(surah, ayahs, from_end=False)
    end_text, end_words, _ = _key(surah, ayahs, True)
    end_keys = key_set(surah, ayahs, from_end=True)
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
    open_heard, open_at, open_probe = False, None, None
    for w in head_windows(first_s, last_s):
        h_windows.append(w)
        h_texts.append(text_of(w))
        score, start, _ = max((match_key(h_texts, h_windows, k, from_end=False, lose_outer=lo) for k, lo in open_keys),
                              key=lambda r: r[0])
        h_scores.append(round(score, 1))
        if len(h_windows) == 1 and score < PROBE_BELOW:  # listen to the opening again in short windows
            h_probe = head_probe_windows(first_s, last_s, opening_pauses(wav, first_s))
            open_probe, p_score, p_start = _run_probe(h_probe, text_of, open_keys, from_end=False)
            if p_score > score:
                score, start = p_score, p_start
        if score >= PARAMS["KEY_PASS"]:
            open_heard, open_at = True, start
            break

    # tail: backward from the last sound until the ending is heard
    t_windows, t_texts, t_scores = [], [], []
    end_heard, end_at, probe = False, None, None
    for w in tail_windows(last_s):
        t_windows.insert(0, w)
        t_texts.insert(0, text_of(w))
        score, _, stop = max((match_key(t_texts, t_windows, k, from_end=True, lose_outer=lo) for k, lo in end_keys),
                             key=lambda r: r[0])
        t_scores.append(round(score, 1))
        if len(t_windows) == 1 and score < PROBE_BELOW:  # listen to the end again in short windows
            probe, p_score, p_stop = _run_probe(probe_windows(last_s, first_s), text_of, end_keys, from_end=True)
            if p_score > score:
                score, stop = p_score, p_stop
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
        "opening": {"words": open_words, "letters_key_words": l_key[1] if l_key else None,
                    "scores": h_scores, "heard": open_heard,
                    "at_s": round(open_at, 1) if open_at is not None else None, "probe": open_probe},
        "ending": {"words": end_words, "scores": t_scores, "heard": end_heard,
                   "at_s": ending_s, "probe": probe},
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


def _run_probe(windows, text_of, keys: list[tuple[str, bool]], *, from_end: bool) -> tuple[dict, float, float | None]:
    """(record {"windows", "score", "heard"}, best score, seconds where the key ends (tail) or starts (head)).

    Each key is scored in each probe window alone and in the first and third windows joined (they meet with a
    2 s overlap); the best counts."""
    texts = [text_of(w) for w in windows]
    groups = [[i] for i in range(len(windows))] + ([[0, 2]] if len(windows) > 2 else [])
    best = (0.0, None, None)
    for key, lose_outer in keys:
        for g in groups:
            best = max(best, match_key([texts[i] for i in g], [windows[i] for i in g], key, from_end=from_end,
                                       lose_outer=lose_outer),
                       key=lambda r: r[0])
    score, start, stop = best
    at = stop if from_end else start
    heard = score >= PARAMS["KEY_PASS"] and at is not None
    record = {"windows": [list(w) for w in windows], "score": round(score, 1), "heard": heard}
    return record, (score if at is not None else 0.0), at


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

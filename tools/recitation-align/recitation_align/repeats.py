"""Repeat-aware stage (ADR 0077 decision 4, plan way2quran-quality Q7a and Q7b). Quality mode only.

A monotonic aligner gives each word one span, so a phrase the reciter recites twice is squeezed into one span or
pushes an ayah start onto the wrong pass (5:31 and 5:85 of reciter 1). This module finds such repeats and re-aligns
them with one words-list entry per recited occurrence:

1. `detect`: candidate regions. Triggers: a stretched word, an anchor window that steps back or holds a word surplus,
   a G3 BAD or UNSURE, and (decision 5) a G2 failure at the end and a G5 outlier. A region runs from the start of
   ayah n-1 to the end of n+1; overlapping regions merge.
2. `dense_windows` (DENSE_WIN_S windows every DENSE_HOP_S), `stitch_windows` (the overlapping transcripts become one
   word sequence), `recited_sequence` (a dynamic program over match, insert, delete and a penalised back-jump to any
   earlier word of the region) and `classify` (within-ayah, cross-ayah or none).
3. `confirm_ctc`: an expanded sequence is kept only when the CTC model prefers it too, by more than CTC_MARGIN in
   mean log-prob per frame over the same frames (the `decide_basmala` pattern: two independent models agree).
   `confirm_jumps` applies it to each back-jump on the frames of its two passes, because a merged region can hold
   several repeats and one mean over the whole region dilutes each; a rejected pass is dropped from the sequence.
4. `realign_region`: the region is aligned again against the expanded tokens through `align.align_emissions`, one
   entry per occurrence (`occurrence` field), sorted by (ayah, start_ms), so an ayah starts at its first occurrence.
   `realign_cuts` re-aligns a region whose ayah start was found by stepped probes (a late or early start that is not
   a repeat): each cut's CTC onset is taken after the probe point.

Keys are normalised copies only: the Quran text is never changed, and records carry keys and numbers only.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import torch
from rapidfuzz import fuzz, process

from .align import STAR_PENALTY, _path_mean, align_emissions, basmala_word_count, surah_tokens
from .quality import PARAMS

REPAIR_MARGIN = 1  # a region runs from ayah n - 1 to n + 1
FAILING = ("G2", "G3", "G5", "stretch")  # triggers that a verdict cannot pass with (the others are candidates)
MATCH_FLOOR = 60  # fuzz.ratio at which an ASR word scores 0 against a region word; 100 scores 1, 20 scores -1
GAP_ASR = 0.7  # an ASR word that matches no region word (Whisper noise)
GAP_REGION = 0.5  # a region word the ASR did not hear (Whisper drops words more often than it invents them)
SEAM_MATCH = 70  # fuzz.ratio for two transcripts of the same audio to count as the same word at a window seam
ONSET_BACK_S = 1.0  # a stepped-probe cut is placed this far before the probe clip, so the CTC onset lies after it


# --- detect -------------------------------------------------------------------------------------------------------

@dataclass
class Region:
    lo: int  # first ayah (inclusive)
    hi: int  # last ayah (inclusive)
    triggers: list[str] = field(default_factory=list)
    focus: list[int] = field(default_factory=list)  # ayahs that raised a trigger
    start_ms: int = 0  # first region word start
    end_ms: int = 0  # start of the first word after the region, or the end of the audio
    why: dict = field(default_factory=dict)  # focus ayah -> its triggers

    @property
    def failing(self) -> bool:
        """The region holds a trigger that keeps the surah from passing (not only a repeat candidate)."""
        return any(t in FAILING for t in self.triggers)

    def key(self, surah: int) -> list[str]:
        return [f"{surah}:{self.lo}", f"{surah}:{self.hi}"]


def _spoken(words):
    return [w for w in words if not w.get("basmala")]


def _ayah_of(key: str) -> int:
    return int(str(key).split(":")[1])


def detect(words: list[dict], anchors: dict | None, gate: dict | None, pace: float, *,
           duration_ms: int | None = None) -> list[Region]:
    """Candidate repeat regions of one surah, sorted and merged.

    `gate` is a gate record (or any dict with its `checks`): G3 `failed`, G2 `status`, G5 `outlier_ayahs`. `anchors`
    is the anchors report: its `repeat_candidates` are the step-back and word-surplus windows. `pace` is seconds per
    letter (`gate.surah_pace`). A stretched word (`gate.stretched_words`) is found here from the words.
    """
    from .gate import stretched_words  # gate imports this module lazily too; no cycle at import time

    spoken = _spoken(words)
    if not spoken:
        return []
    n_last = max(w["ayah"] for w in spoken)
    found: list[tuple[int, str]] = []
    for key, _, _ in stretched_words(words, pace):
        found.append((_ayah_of(key), "stretch"))
    for cand in (anchors or {}).get("repeat_candidates", []):
        a, b = sorted((_ayah_of(cand["from"]), _ayah_of(cand["to"])))
        for why in cand.get("why", []):
            for n in range(a, b + 1):
                found.append((n, why))
    checks = (gate or {}).get("checks", {})
    for n in checks.get("G3", {}).get("failed", []) or []:
        found.append((int(n), "G3"))
    if isinstance(checks.get("G2"), dict) and checks["G2"].get("status") == "fail":
        found.append((n_last, "G2"))
    for n in (checks.get("G5", {}) or {}).get("outlier_ayahs", []) or []:
        found.append((int(n), "G5"))

    raw = sorted({(max(1, n - REPAIR_MARGIN), min(n_last, n + REPAIR_MARGIN), n, t) for n, t in found})
    merged: list[Region] = []
    for lo, hi, n, t in raw:
        if merged and lo <= merged[-1].hi:
            r = merged[-1]
            r.hi = max(r.hi, hi)
        else:
            r = Region(lo, hi)
            merged.append(r)
        if t not in r.triggers:
            r.triggers.append(t)
        if n not in r.focus:
            r.focus.append(n)
        r.why.setdefault(n, [])
        if t not in r.why[n]:
            r.why[n].append(t)
    for r in merged:
        r.triggers.sort()
        r.focus.sort()
        for n in r.why:
            r.why[n].sort()
        r.start_ms, r.end_ms = bounds(words, r.lo, r.hi, duration_ms)
    return merged


def bounds(words: list[dict], lo: int, hi: int, duration_ms: int | None = None) -> tuple[int, int]:
    """(first spoken word start of ayahs lo..hi, start of the first word after them or the end of the audio)."""
    spoken = _spoken(words)
    start = min(w["start_ms"] for w in spoken if lo <= w["ayah"] <= hi)
    after = [w["start_ms"] for w in spoken if w["ayah"] > hi]
    end = min(after) if after else (duration_ms if duration_ms is not None else max(w["end_ms"] for w in spoken))
    return start, end


def split(region: Region, words: list[dict], duration_ms: int | None = None) -> list[Region]:
    """One region per focus ayah n (n - 1 .. n + 1 inside the merged region), with that ayah's own triggers: the
    per-ayah fallback when a merged region cannot be repaired as a whole (ADR 0077 decision 5: repair runs per
    ayah)."""
    out = []
    for n in region.focus:
        lo, hi = max(region.lo, n - REPAIR_MARGIN), min(region.hi, n + REPAIR_MARGIN)
        r = Region(lo, hi, list(region.why.get(n, region.triggers)), [n], why={n: list(region.why.get(n, []))})
        r.start_ms, r.end_ms = bounds(words, lo, hi, duration_ms)
        out.append(r)
    return out


# --- dense ASR and the recited sequence ---------------------------------------------------------------------------

def dense_windows(region: Region) -> list[tuple[float, float]]:
    """DENSE_WIN_S windows every DENSE_HOP_S over the region's audio; the last one ends at the region's end."""
    lo, hi = region.start_ms / 1000, region.end_ms / 1000
    win, hop = PARAMS["DENSE_WIN_S"], PARAMS["DENSE_HOP_S"]
    if hi - lo <= win:
        return [(round(lo, 3), round(hi, 3))]
    out, t = [], lo
    while True:
        end = min(t + win, hi)
        out.append((round(t, 3), round(end, 3)))
        if end >= hi:
            return out
        t += hop


def _seam(a: list[str], b: list[str]) -> int:
    """How many leading words of `b` repeat the end of `a` (overlap alignment: free start in `a`, `a` consumed to its
    end, `b` from its start, free end in `b`). 0 when no overlap scores above 0."""
    m, n = len(a), len(b)
    if not m or not n:
        return 0
    h = [[0.0] * (n + 1) for _ in range(m + 1)]
    for j in range(1, n + 1):
        h[0][j] = -float(j)
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            s = 1.0 if fuzz.ratio(a[i - 1], b[j - 1]) >= SEAM_MATCH else -1.0
            h[i][j] = max(h[i - 1][j - 1] + s, h[i - 1][j] - 1.0, h[i][j - 1] - 1.0)
    best_j = max(range(n + 1), key=lambda j: (h[m][j], -j))
    return best_j if h[m][best_j] > 0 else 0


def stitch_windows(texts: list[list[str]]) -> list[str]:
    """One word sequence from overlapping window transcripts (normalised words, time order).

    Consecutive windows share DENSE_WIN_S - DENSE_HOP_S seconds, so the start of each transcript repeats the end of
    the one before it. Each seam is found by an overlap alignment against the previous window's words and the
    repeated words are dropped, so a seam is never read as a back-jump.
    """
    out: list[str] = []
    prev: list[str] = []
    for words in texts:
        words = [w for w in words if w]
        k = _seam(prev, words)
        out.extend(words[k:])
        prev = words
    return out


def _similarity(asr: list[str], region: list[str]) -> np.ndarray:
    ratio = process.cdist(asr, region, scorer=fuzz.ratio, dtype=np.float32)
    return np.clip((ratio - MATCH_FLOOR) / (100 - MATCH_FLOOR), -1.0, 1.0)


def recited_sequence(asr_words: list[str], region_words: list[str], back_penalty: float) -> list[int]:
    """The region's word indices in recited order (every region word at least once).

    A dynamic program over the ASR words. Its state is the last region word reached (-1 before the first). Moves:
    match or substitute the next region word (similarity in [-1, 1]), insert an ASR word (-GAP_ASR), delete a region
    word the ASR did not hear (-GAP_REGION), and a back-jump to any earlier word (-`back_penalty`), after which the
    words from the jump target are recited again. The back-jump to any earlier state is a running suffix maximum, so
    the cost is O(len(asr) x len(region)). A tie never jumps.
    """
    R = len(region_words)
    if R == 0:
        return []
    n = len(asr_words)
    S = _similarity(asr_words, region_words) if n else np.zeros((0, R), dtype=np.float32)
    idx = np.arange(R + 1, dtype=np.float64)
    neg = -1e18
    eps = 1e-9

    def deletes(v: np.ndarray) -> np.ndarray:
        return np.maximum.accumulate(v + GAP_REGION * idx) - GAP_REGION * idx

    start = np.full(R + 1, neg)
    start[0] = 0.0
    rows_n, rows_j, rows_d = [], [], [deletes(start)]
    for i in range(n):
        d = rows_d[-1]
        match = np.full(R + 1, neg)
        match[1:] = d[:-1] + S[i]
        stay = d - GAP_ASR
        nxt = np.maximum(match, stay)
        suffix = np.maximum.accumulate(nxt[::-1])[::-1]  # suffix[t] = max over u >= t
        jump = np.full(R + 1, neg)
        jump[:-1] = suffix[1:] - back_penalty  # from any later state u > t back to t
        after = np.where(jump > nxt + eps, jump, nxt)
        rows_n.append((match, stay, nxt))
        rows_j.append(after)
        rows_d.append(deletes(after))

    # traceback from "every region word reached" after the last ASR word
    events: list[int] = []  # recited words, last first
    s = R
    for i in range(n, -1, -1):
        d = rows_d[i]
        before = rows_j[i - 1] if i else start
        # deletes: the largest u <= s (fewest deletes) with before[u] - GAP_REGION * (s - u) == d[s]
        u = s
        while u > 0 and abs(before[u] - GAP_REGION * (s - u) - d[s]) > 1e-6:
            u -= 1
        events.extend(range(s - 1, u - 1, -1))
        s = u
        if i == 0:
            break
        match, stay, nxt = rows_n[i - 1]
        if rows_j[i - 1][s] > nxt[s] + eps:  # a back-jump from a later state u to s
            s = s + 1 + int(np.argmax(nxt[s + 1:]))
        if s > 0 and match[s] >= stay[s]:
            events.append(s - 1)  # ASR word i - 1 matched region word s - 1
            s -= 1
        # otherwise ASR word i - 1 was inserted and the state stays
    events.reverse()
    return events


def back_jumps(seq: list[int]) -> list[tuple[int, int]]:
    """(from word, to word) for every step of `seq` that does not move forward."""
    return [(a, b) for a, b in zip(seq, seq[1:]) if b <= a]


def classify(seq: list[int], word_ayah: list[int]) -> str:
    """`cross-ayah` when a back-jump lands in an earlier ayah than the word it leaves, `within-ayah` when every
    back-jump stays in its ayah, `none` without a back-jump."""
    jumps = back_jumps(seq)
    if not jumps:
        return "none"
    if any(word_ayah[b] != word_ayah[a] for a, b in jumps):
        return "cross-ayah"
    return "within-ayah"


# --- CTC: confirm and re-align (Q7b) -------------------------------------------------------------------------------

@dataclass
class RegionText:
    """The words of a region and their CTC tokens (alignment keys; the word stays the Tanzil token)."""
    surah: int
    lo: int
    hi: int
    sw: list  # [(ayah, position, word, key)], basmala words excluded
    wtok: list  # tokens of each word
    f0: int  # first emission frame of the region
    f1: int  # end emission frame (exclusive)
    spf: float  # seconds per emission frame

    @property
    def word_ayah(self) -> list[int]:
        return [a for a, _, _, _ in self.sw]

    @property
    def keys(self) -> list[str]:
        return [k for _, _, _, k in self.sw]

    def tokens(self, seq: list[int]) -> list[int]:
        return [t for wi in seq for t in self.wtok[wi]]


def region_text(surah: int, ayahs: dict, lo: int, hi: int, vocab: dict, *, f0: int, f1: int,
                spf: float) -> RegionText:
    """Words lo..hi with their tokens, through `align.surah_tokens` (muqatta'at spelled out), basmala excluded."""
    sw, tokens, wot, _ = surah_tokens(surah, ayahs, lo, hi, False, vocab)
    n_basmala = basmala_word_count(surah, ayahs)
    keep = [i for i, (a, p, _, _) in enumerate(sw) if not (a == 1 and p <= n_basmala)]
    wtok = [[] for _ in sw]
    for t, wi in zip(tokens, wot):
        wtok[wi].append(t)
    return RegionText(surah, lo, hi, [sw[i] for i in keep], [wtok[i] for i in keep], f0, f1, spf)


def confirm_ctc(em: torch.Tensor, plain_tokens: list[int], expanded_tokens: list[int], frames: tuple[int, int],
                blank: int = 0) -> tuple[bool, float | None]:
    """(accepted, margin): the mean log-prob per frame of the expanded path minus the plain path's, over the same
    frames, with a leading and a trailing star as in `decide_basmala`. Accepted when the margin beats CTC_MARGIN.
    A path that cannot fit the frames is rejected with margin None."""
    f0, f1 = frames
    window = em[f0:f1]
    try:
        with torch.inference_mode():
            plain = _path_mean(window, plain_tokens, blank, STAR_PENALTY)
            expanded = _path_mean(window, expanded_tokens, blank, STAR_PENALTY)
    except (RuntimeError, ValueError):
        return False, None
    margin = expanded - plain
    return margin > PARAMS["CTC_MARGIN"], round(margin, 4)


JUMP_PAD_FRAMES = 25  # 0.5 s of context on each side of a back-jump's two passes, absorbed by the stars


def _second_pass(seq: list[int], k: int) -> tuple[int, int]:
    """For the back-jump into seq[k]: (index of the first-pass occurrence of the jump target, index of the last word
    of the second pass, which runs forward from k up to the word the jump left)."""
    p, q = seq[k - 1], seq[k]
    i0 = k - 1
    while i0 > 0 and seq[i0 - 1] < seq[i0] and seq[i0] > q:
        i0 -= 1
    k1 = k
    while k1 + 1 < len(seq) and seq[k1 + 1] == seq[k1] + 1 and seq[k1 + 1] <= p:
        k1 += 1
    return i0, k1


def confirm_jumps(em: torch.Tensor, rt: "RegionText", seq: list[int], blank: int = 0) -> tuple[list[int], list[dict]]:
    """Confirm each back-jump of `seq` on its own: the region is aligned once against `seq` to place the passes, then
    for every jump `confirm_ctc` compares the phrase recited once (plain) with twice (expanded) over the frames of
    both passes (+-JUMP_PAD_FRAMES). A merged region can hold many jumps; one mean over the whole region would dilute
    each. Returns (the sequence without the rejected passes, [{"from", "to", "margin", "accepted"}] in order)."""
    jumps = [k for k in range(1, len(seq)) if seq[k] <= seq[k - 1]]
    if not jumps:
        return list(seq), []
    try:
        agg = _align(em, rt, seq, rt.f0, rt.f1, blank, leading_star=True)
    except (RuntimeError, ValueError):
        agg = {}
    details, drop = [], set()
    for k in jumps:
        i0, k1 = _second_pass(seq, k)
        rec = {"from": seq[k - 1], "to": seq[k], "margin": None, "accepted": False}
        if i0 in agg and k1 in agg:
            f0 = max(rt.f0, agg[i0]["start"] + rt.f0 - JUMP_PAD_FRAMES)
            f1 = min(rt.f1, agg[k1]["end"] + rt.f0 + JUMP_PAD_FRAMES)
            ok, margin = confirm_ctc(em, rt.tokens(seq[i0:k]), rt.tokens(seq[i0:k1 + 1]), (f0, f1), blank)
            rec.update(margin=margin, accepted=ok)
        if not rec["accepted"]:
            drop.update(range(k, k1 + 1))
        details.append(rec)
    return [wi for i, wi in enumerate(seq) if i not in drop], details


def _groups(seq: list[int], word_ayah: list[int]) -> list[int]:
    """Group ids for `align_emissions` (words grouped by ayah): a new group at every ayah change and every
    back-jump, so a cross-ayah repeat is still a sequence of contiguous groups."""
    out, g = [], -1
    for k, wi in enumerate(seq):
        if k == 0 or word_ayah[wi] != word_ayah[seq[k - 1]] or wi <= seq[k - 1]:
            g += 1
        out.append(g)
    return out


def _aborted(seq: list[int], word_ayah: list[int]) -> set[int]:
    """Occurrences (indices into `seq`) of an ayah's opening that the reciter abandoned: after a cross-ayah
    back-jump from ayah n into an earlier ayah, the occurrences of n before the jump are dropped (P6), so n starts at
    the pass that continues into it."""
    drop: set[int] = set()
    for k in range(1, len(seq)):
        a, b = seq[k - 1], seq[k]
        if b <= a and word_ayah[b] < word_ayah[a]:
            n = word_ayah[a]
            j = k - 1
            while j >= 0 and word_ayah[seq[j]] == n and (j == k - 1 or seq[j] < seq[j + 1]):
                drop.add(j)
                j -= 1
    return drop


def _entries(rt: RegionText, seq: list[int], agg: dict, frame0: int, *, occurrence: bool) -> list[dict]:
    out, seen = [], {}
    for k, wi in enumerate(seq):
        if k not in agg:
            continue
        a, pos, w, _ = rt.sw[wi]
        r = agg[k]
        seen[wi] = seen.get(wi, 0) + 1
        entry = {"surah": rt.surah, "ayah": a, "position": pos, "word": w,
                 "start_ms": round((r["start"] + frame0) * rt.spf * 1000),
                 "end_ms": round((r["end"] + frame0 + 1) * rt.spf * 1000),
                 "confidence": round(sum(r["score"]) / len(r["score"]), 3)}
        if occurrence:
            entry["occurrence"] = seen[wi]
        out.append(entry)
    return out


def _align(em, rt: RegionText, seq: list[int], f0: int, f1: int, blank: int, leading_star: bool) -> dict:
    from .checkpoints import SETTINGS

    tokens, wot = [], []
    for k, wi in enumerate(seq):
        for t in rt.wtok[wi]:
            tokens.append(t)
            wot.append(k)
    with torch.inference_mode():
        return align_emissions(em[f0:f1], tokens, wot, _groups(seq, rt.word_ayah), blank,
                               leading_star=leading_star, **SETTINGS)


def realign_region(em: torch.Tensor, rt: RegionText, expanded: list[int], blank: int = 0) -> list[dict]:
    """The region aligned against the expanded word sequence: one entry per occurrence with an `occurrence` field
    (1 for the first pass), sorted by (ayah, start_ms), so each ayah starts at its first occurrence. A cross-ayah
    jump drops the abandoned opening of the later ayah (P6)."""
    agg = _align(em, rt, expanded, rt.f0, rt.f1, blank, leading_star=True)
    drop = _aborted(expanded, rt.word_ayah)
    agg = {k: v for k, v in agg.items() if k not in drop}
    words = _entries(rt, expanded, agg, rt.f0, occurrence=True)
    words.sort(key=lambda w: (w["ayah"], w["start_ms"]))
    return words


def realign_cuts(em: torch.Tensor, rt: RegionText, cuts: list[tuple[int, float]], blank: int = 0,
                 seq: list[int] | None = None) -> list[dict]:
    """The region re-aligned at stepped-probe points. `cuts` are (word index into `seq`, probe clip start in s).

    Right to left: the words from a cut on are aligned from ONSET_BACK_S before the probe point to the next onset
    (or the region end) with a leading star, which gives the cut word's CTC onset; the words before it are then
    aligned up to that onset. Raises RuntimeError when a segment cannot be aligned.
    """
    seq = list(range(len(rt.sw))) if seq is None else seq
    fps = 1 / rt.spf
    bounds = sorted(cuts)
    end = rt.f1
    pieces: list[tuple[list[int], dict, int]] = []
    ks = [0] + [k for k, _ in bounds]
    for idx in range(len(bounds), -1, -1):
        k0 = ks[idx]
        k1 = ks[idx + 1] if idx + 1 < len(ks) else len(seq)
        part = seq[k0:k1]
        if idx == 0:
            f0, lead = rt.f0, True
        else:
            f0 = max(rt.f0, round((bounds[idx - 1][1] - ONSET_BACK_S) * fps))
            lead = True
        if f0 >= end or not part:
            raise RuntimeError("a stepped-probe cut leaves no audio for its words")
        agg = _align(em, rt, part, f0, end, blank, leading_star=lead)
        if 0 not in agg:
            raise RuntimeError("the cut word was not aligned")
        pieces.append((part, agg, f0))
        end = agg[0]["start"] + f0
    words: list[dict] = []
    for part, agg, f0 in reversed(pieces):
        words.extend(_entries(rt, part, agg, f0, occurrence=False))
    words.sort(key=lambda w: (w["ayah"], w["start_ms"]))
    return words

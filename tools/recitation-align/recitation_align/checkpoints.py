"""ASR checkpoints and segmented alignment (ADR 0077 decision 3, plan way2quran-quality Q4). Quality mode only.

The whole-surah aligner (`align.align_emissions`) can stretch committed words over later audio and then run out
of frames (drift). Here the surah is cut into segments at frame-precise ayah starts found by ASR, and each segment
is aligned on its own, with no first pass:

1. `schedule`: 30 s ASR windows on every `ASR_EVERY`-th grid window, plus completeness's head and tail windows.
   Grid window 0 is replaced by the head windows (P11), and a grid window that overlaps a head or tail window is
   dropped (the same audio is never transcribed twice).
2. `locate_chunks`: each window's normalised text is located in the surah's normalised word keys
   (`partial_ratio_alignment`): forward over a region sized to the elapsed time at `SCORE_NEAR`, otherwise over
   the whole surah at `SCORE_FAR`. A window that steps back more than `BACK_WORDS` words is a `repeat`: it never
   anchors and does not move the cursor.
3. `chain`: the longest non-decreasing chain on word index, then the pace filter (`PACE`).
4. `local_checkpoints`: the window's words are force-aligned inside the window's own audio (+-`EDGE_S`, leading
   and trailing star). An ayah start at least `EDGE_WORDS` words and `EDGE_S` seconds inside the window, with
   local confidence >= `MIN_CONF`, of an ayah `anchors.usable_ayahs` keeps (no refrain), is a checkpoint.
5. `pick_cuts`: one cut every >= `CUT_SPACING_S`, at the checkpoint frame minus `CUT_BACK_FRAMES`.
6. `align_cut`: segment 0 has a leading star, every segment a trailing star. A failing segment drops a cut, merges
   with its neighbour and is logged; with no cut left it raises.
7. `pace_breaks`: the middle-gap input (ADR 0077 decision 2a). The skipped grid windows inside a pace break are
   transcribed, then the adjacent-jump test runs.

Fail-safe (`AnchorsInsufficient`): fewer than floor(duration x `MIN_CP_PER_S`) checkpoints (at least one per full
600 s), or an unresolved pace break. The drifting aligner is never used as a fallback.

`align.surah_tokens`, `decide_basmala`, `align_emissions` and `basmala_word_count` are reused unchanged.
Normalisation is a matching key only; the Quran text is never changed. Reports carry keys and numbers only.
"""

from __future__ import annotations

import bisect
import math
import statistics
import sys
import time
from dataclasses import dataclass, field

import torch
from rapidfuzz import fuzz

from .align import (LOOKAHEAD_TOKENS, MAX_TOKENS, MUQATTAAT, SLACK, STAR_PENALTY, _expand_muqattaat, _words,
                    align_emissions, basmala_word_count, decide_basmala, surah_tokens)
from .anchors import usable_ayahs
from .models import ASR_MODEL, ASR_REVISION
from .quality import PARAMS
from .snap import SNAP_WINDOW_MS, snap_to_pauses
from .text import norm

WINDOW_S = 30.0
MIN_CHUNK_CHARS = 20  # normalised characters; shorter windows (silence, takbir) are not located
REGION_MIN_CHARS = 800  # the forward search region holds at least this many characters
REGION_BACK_WORDS = 20  # the forward region starts this many words before the cursor (plus BACK_WORDS)
SURPLUS = 1.25  # a window whose ASR holds more than this many times the words it matched may hold a repeat
ADJACENT_S = WINDOW_S + 1.0  # two windows whose starts are at most this far apart are adjacent
SETTINGS = dict(max_tokens=MAX_TOKENS, lookahead_tokens=LOOKAHEAD_TOKENS, slack=SLACK, star_penalty=STAR_PENALTY)


class AnchorsInsufficient(Exception):
    """The fail-safe fired: no anchored output for this surah (stage `anchors`)."""


@dataclass
class Located:
    chunk: int  # index of the window in the schedule
    start_s: float
    end_s: float
    ws: int  # first surah word index (inclusive)
    we: int  # last surah word index (inclusive)
    score: float
    status: str = "ok"  # ok | far | repeat | order | pace
    qwords: int = 0  # normalised words in the window's ASR text


@dataclass
class Checkpoint:
    ayah: int
    word: int  # surah word index of the ayah's first word
    frame: int  # global emission frame of that word's start
    conf: float
    chunk: int
    words: dict = field(default_factory=dict)  # interior word index -> global start frame


# --- schedule ---------------------------------------------------------------------------------------------------

def _w(start: float, end: float) -> tuple[float, float]:
    return round(float(start), 3), round(float(end), 3)


def _overlaps(a: tuple[float, float], b: tuple[float, float]) -> bool:
    return a[0] < b[1] and b[0] < a[1]


def grid_windows(duration_s: float) -> list[tuple[float, float]]:
    """Every 30 s grid window of the file; the last one is cut at the end and dropped below 1 s."""
    out = []
    for k in range(math.ceil(duration_s / WINDOW_S)):
        lo, hi = k * WINDOW_S, min((k + 1) * WINDOW_S, duration_s)
        if hi - lo >= 1.0:
            out.append(_w(lo, hi))
    return out


def schedule(duration_s: float, head_windows, tail_windows, every: int) -> list[tuple[float, float]]:
    """The windows to transcribe, in time order: every `every`-th grid window except window 0 (replaced by the
    head windows, P11), without grid windows that overlap a head or tail window, plus the head and tail windows."""
    fixed = sorted({_w(*w) for w in list(head_windows) + list(tail_windows)})
    grid = [w for k, w in enumerate(grid_windows(duration_s))
            if k and k % every == 0 and not any(_overlaps(w, f) for f in fixed)]
    return sorted(set(grid) | set(fixed))


def skipped_windows(duration_s: float, scheduled) -> list[tuple[float, float]]:
    """Grid windows that the schedule does not transcribe and that overlap no scheduled window."""
    return [w for w in grid_windows(duration_s) if not any(_overlaps(w, s) for s in scheduled)]


# --- locate -----------------------------------------------------------------------------------------------------

def _char_map(keys: list[str]) -> tuple[str, list[int]]:
    text, owner = [], []
    for wi, k in enumerate(keys):
        if wi:
            text.append(" ")
            owner.append(wi)
        text.append(k)
        owner.extend([wi] * len(k))
    return "".join(text), owner


def locate_chunks(windows: list[dict], keys: list[str], pace: float, *, start_word: int = 0,
                  start_s: float = 0.0, until_word: int | None = None) -> list[Located]:
    """Locate each window ({"start_s", "end_s", "text"}, in time order) in the surah's word keys.

    `pace` is normalised characters of the joined keys per second of audio. The forward region runs from just
    before the cursor to max(`REGION_MIN_CHARS`, 2 x pace x seconds since the last located window) past it, at
    `SCORE_NEAR`; otherwise the whole surah is searched at `SCORE_FAR` (`far`). A forward match that starts more
    than `BACK_WORDS` before the previous located window's end is a `repeat` and keeps the cursor. Windows with
    too little text or no match are skipped (no Located). `start_word`/`start_s` resume from a known place, and
    `until_word` extends the forward region to the end of that word (a pace break's known far side).
    """
    text, owner = _char_map(keys)
    if not text:
        return []
    starts = [i for i in range(len(text)) if i == 0 or text[i - 1] == " "]
    word_char = {owner[i]: i for i in starts}
    out: list[Located] = []
    cursor_word, cursor_s = start_word, start_s
    prev_we = start_word if start_word else None
    for ci, c in enumerate(windows):
        q = norm(c["text"])
        if len(q) < MIN_CHUNK_CHARS:
            continue
        lo_word = max(0, cursor_word - PARAMS["BACK_WORDS"] - REGION_BACK_WORDS)
        lo = word_char.get(lo_word, 0)
        cursor_char = word_char.get(cursor_word, 0)
        elapsed = max(0.0, c["end_s"] - cursor_s)
        hi = cursor_char + max(REGION_MIN_CHARS, int(2 * pace * elapsed))
        if until_word is not None:
            hi = max(hi, word_char.get(until_word, 0) + len(keys[min(until_word, len(keys) - 1)]))
        hi = min(len(text), hi)
        r = fuzz.partial_ratio_alignment(q, text[lo:hi])
        status, off = "ok", lo
        if r is None or r.score < PARAMS["SCORE_NEAR"]:
            r = fuzz.partial_ratio_alignment(q, text)
            if r is None or r.score < PARAMS["SCORE_FAR"]:
                continue
            status, off = "far", 0
        a = r.dest_start + off
        b = max(a, r.dest_end + off - 1)
        ws, we = owner[min(a, len(owner) - 1)], owner[min(b, len(owner) - 1)]
        loc = Located(c.get("idx", ci), c["start_s"], c["end_s"], ws, we, round(r.score, 1), status,
                      len(q.split()))
        last_we = out[-1].we if out else prev_we
        if status == "ok" and last_we is not None and ws < last_we - PARAMS["BACK_WORDS"]:
            loc.status = "repeat"  # recited again: never a checkpoint, the cursor stays
        else:
            cursor_word = max(cursor_word, we)
            cursor_s = c["end_s"]
        out.append(loc)
    return out


def chain(located: list[Located], tokens_per_word: list[int], pace: float) -> list[Located]:
    """`ok` and `far` windows along the longest non-decreasing chain on word index, then without pace outliers.

    `pace` is tokens per second. Dropped windows get status `order` or `pace`.
    """
    cand = [x for x in located if x.status in ("ok", "far")]
    tails, tail_idx, prev = [], [], [-1] * len(cand)
    for i, x in enumerate(cand):
        k = bisect.bisect_right(tails, x.ws)
        if k == len(tails):
            tails.append(x.ws)
            tail_idx.append(i)
        else:
            tails[k] = x.ws
            tail_idx[k] = i
        prev[i] = tail_idx[k - 1] if k else -1
    keep, i = [], tail_idx[-1] if tail_idx else -1
    while i != -1:
        keep.append(cand[i])
        i = prev[i]
    keep.reverse()
    kept_ids = {id(x) for x in keep}
    for x in cand:
        if id(x) not in kept_ids:
            x.status = "order"
    cum = [0]
    for t in tokens_per_word:
        cum.append(cum[-1] + t)
    low, high = PARAMS["PACE"]
    out: list[Located] = []
    for x in keep:
        if out:
            p = out[-1]
            dt = x.start_s - p.start_s
            dtok = cum[x.ws] - cum[p.ws]
            rate = dtok / dt / pace if dt > 0 and pace > 0 else float("inf")
            if dtok > 0 and not low <= rate <= high:
                x.status = "pace"
                continue
        out.append(x)
    return out


# --- checkpoints and cuts ---------------------------------------------------------------------------------------

def local_checkpoints(em: torch.Tensor, kept: list[Located], tokens: list[int], wot: list[int], aow: list[int],
                      blank: int, fps: float, usable: set[int] | dict) -> list[Checkpoint]:
    """One entry per kept window: its best checkpoint, or ayah -1 when none qualifies (its interior word starts
    are still kept, for the held-out measure). Local CTC inside the window +-`EDGE_S`."""
    first_word: dict[int, int] = {}
    for wi, a in enumerate(aow):
        first_word.setdefault(a, wi)
    edge_s, edge_w, min_conf = PARAMS["EDGE_S"], PARAMS["EDGE_WORDS"], PARAMS["MIN_CONF"]
    out: list[Checkpoint] = []
    for x in kept:
        f0 = max(0, round((x.start_s - edge_s) * fps))
        f1 = min(em.shape[0], round((x.end_s + edge_s) * fps))
        tsel = [ti for ti, wi in enumerate(wot) if x.ws <= wi <= x.we]
        if not tsel or f1 <= f0:
            continue
        try:
            sub = align_emissions(em[f0:f1], [tokens[ti] for ti in tsel], [wot[ti] - x.ws for ti in tsel],
                                  aow[x.ws:x.we + 1], blank, leading_star=True, **SETTINGS)
        except (RuntimeError, ValueError):
            continue
        conf = {x.ws + k: sum(r["score"]) / len(r["score"]) for k, r in sub.items()}
        start = {x.ws + k: r["start"] + f0 for k, r in sub.items()}
        lo_f, hi_f = (x.start_s + edge_s) * fps, (x.end_s - edge_s) * fps
        interior = {wi: start[wi] for wi in range(x.ws + edge_w, x.we - edge_w + 1)
                    if wi in start and lo_f <= start[wi] <= hi_f}
        best = None
        for wi in interior:
            ay = aow[wi]
            if ay == 1 or ay not in usable or first_word[ay] != wi or (wi + 1) not in conf or (wi - 1) not in conf:
                continue
            c = (conf[wi - 1] + conf[wi] + conf[wi + 1]) / 3
            if c >= min_conf and (best is None or c > best.conf):
                best = Checkpoint(ay, wi, start[wi], c, x.chunk, interior)
        out.append(best if best is not None else Checkpoint(-1, -1, -1, 0.0, x.chunk, interior))
    return out


def pick_cuts(cps: list[Checkpoint], spacing_s: float, fps: float, first_frame: int = 0) -> list[Checkpoint]:
    """Walking forward: the most confident checkpoint in each [last + spacing, last + 1.5 spacing], or else the
    next one after last + spacing. Ayahs strictly increase, and ayah 1 is never cut."""
    cps = sorted((c for c in cps if c.ayah > 1), key=lambda c: c.frame)
    cuts: list[Checkpoint] = []
    last_f, last_a = first_frame, 1
    i = 0
    while i < len(cps):
        lo = last_f + spacing_s * fps
        grp = [c for c in cps[i:] if lo <= c.frame <= lo + 0.5 * spacing_s * fps and c.ayah > last_a]
        if not grp:
            nxt = [c for c in cps[i:] if c.frame > lo and c.ayah > last_a]
            if not nxt:
                break
            grp = [nxt[0]]
        best = max(grp, key=lambda c: c.conf)
        cuts.append(best)
        last_f, last_a = best.frame, best.ayah
        i = cps.index(best) + 1
    return cuts


def align_cut(em: torch.Tensor, tokens: list[int], wot: list[int], aow: list[int], blank: int,
              cuts: list[tuple[int, int]], log=None, align_fn=None) -> tuple[dict, list, list]:
    """Align segment by segment at `cuts` [(ayah, frame)]. Returns (agg, cuts_used, merges).

    A segment that fails drops the cut at its end (the last segment: at its start), so it merges with its
    neighbour; each merge is logged. Raises RuntimeError when a segment fails and no cut is left.
    """
    align_fn = align_fn or align_emissions
    log = log or (lambda m: print(m, file=sys.stderr))
    cuts = list(cuts)
    cache: dict = {}
    merges: list[dict] = []
    while True:
        starts = [(aow[0], 0)] + cuts
        agg: dict = {}
        failed = None
        for idx, (a0, f0) in enumerate(starts):
            a1, f1 = cuts[idx] if idx < len(cuts) else (None, em.shape[0])
            key = (a0, f0, a1, f1)
            if key not in cache:
                wsel = [wi for wi, a in enumerate(aow) if a >= a0 and (a1 is None or a < a1)]
                if not wsel:
                    cache[key] = RuntimeError(f"segment {idx} has no words")
                else:
                    w0, w1 = wsel[0], wsel[-1] + 1
                    tsel = [t for t, wi in enumerate(wot) if w0 <= wi < w1]
                    try:
                        sub = align_fn(em[f0:f1], [tokens[t] for t in tsel], [wot[t] - w0 for t in tsel],
                                       aow[w0:w1], blank, leading_star=(idx == 0), **SETTINGS)
                        cache[key] = (w0, sub)
                    except (RuntimeError, ValueError) as exc:
                        cache[key] = exc
            res = cache[key]
            if isinstance(res, Exception):
                failed = (idx, res)
                break
            w0, sub = res
            for lwi, r in sub.items():
                agg[w0 + lwi] = {"start": r["start"] + f0, "end": r["end"] + f0, "score": r["score"]}
        if failed is None:
            return agg, cuts, merges
        idx, exc = failed
        if not cuts:
            raise RuntimeError(f"segmented alignment failed with no cut left: {exc}") from exc
        drop = idx if idx < len(cuts) else idx - 1
        merges.append({"segment": idx, "dropped_cut_ayah": cuts[drop][0], "reason": str(exc)[:200]})
        log(f"anchors: segment {idx} failed; dropping the cut at ayah {cuts[drop][0]}")
        del cuts[drop]


# --- pace breaks (the middle-gap input) -------------------------------------------------------------------------

def _word_rates(seq: list[Located]) -> list[tuple[Located, Located, float]]:
    out = []
    for p, x in zip(seq, seq[1:]):
        dt = x.start_s - p.start_s
        if dt > 0:
            out.append((p, x, (x.ws - p.ws) / dt))
    return out


def pace_breaks(kept: list[Located], keys: list[str], aow: list[int], skipped, transcribe_windows,
                refrains: set[int], char_pace: float) -> list[dict]:
    """Pace breaks between consecutive kept windows (ADR 0077 decision 2a). Returns one entry per break.

    A pair whose implied pace (words per second) lies outside `PACE_BREAK` x the median pair pace is a break.
    The skipped grid windows inside it are transcribed (`transcribe_windows(windows) -> [text]`) and located
    forward from the break's start, up to its far side. Status:
    - `jump`: two adjacent 30 s windows locate more than `ADJ_JUMP` x 30 s x median pace words apart, both forward
      (`ok`) matches outside a refrain. The middle-gap input of the gate (a flag on its own).
    - `resolved`: no jump, and every skipped window inside the break located.
    - `unresolved`: no jump, and some audio inside the break could not be placed. The fail-safe fires.
    """
    rates = _word_rates(kept)
    if not rates:
        return []
    med = statistics.median(r for _, _, r in rates)
    if med <= 0:
        return []
    low, high = PARAMS["PACE_BREAK"]
    jump_words = PARAMS["ADJ_JUMP"] * WINDOW_S * med
    out = []
    for p, x, rate in rates:
        if low * med <= rate <= high * med:
            continue
        inside = [w for w in skipped if w[0] >= p.end_s - 1.0 and w[1] <= x.start_s + 1.0]
        texts = transcribe_windows(inside) if inside else []
        mid = locate_chunks([{"start_s": s, "end_s": e, "text": t} for (s, e), t in zip(inside, texts)],
                            keys, char_pace, start_word=p.we, start_s=p.end_s, until_word=x.we)
        seq = [p] + [m for m in mid if m.status in ("ok", "far")] + [x]
        jumped = 0
        for a, b in zip(seq, seq[1:]):
            if b.start_s - a.start_s > ADJACENT_S or a.status != "ok" or b.status != "ok":
                continue
            if aow[a.we] in refrains or aow[b.ws] in refrains:
                continue
            if b.ws - a.ws > jump_words:
                jumped = max(jumped, b.ws - a.ws)
        if jumped:
            status = "jump"
        elif len(mid) == len(inside):
            status = "resolved"
        else:
            status = "unresolved"
        out.append({"from_s": p.start_s, "to_s": x.start_s, "from_ayah": aow[p.ws], "to_ayah": aow[x.ws],
                    "pace_x": round(rate / med, 2), "transcribed": len(inside), "located": len(mid),
                    "jump_words": jumped, "status": status})
    return out


# --- the anchored pass ------------------------------------------------------------------------------------------

def _repeat_windows(located: list[Located]) -> set[int]:
    """Windows that may hold a repeat: a step-back, the window before it, and a word-surplus window."""
    rep: set[int] = set()
    for i, x in enumerate(located):
        if x.status == "repeat":
            rep.add(x.chunk)
            if i:
                rep.add(located[i - 1].chunk)
        if x.qwords > SURPLUS * (x.we - x.ws + 1):
            rep.add(x.chunk)
    return rep


def _repeat_candidates(located: list[Located], aow: list[int], surah: int) -> list[dict]:
    out = []
    for x in located:
        why = []
        if x.status == "repeat":
            why.append("step-back")
        if x.qwords > SURPLUS * (x.we - x.ws + 1):
            why.append("word-surplus")
        if why:
            out.append({"from": f"{surah}:{aow[x.ws]}", "to": f"{surah}:{aow[x.we]}", "why": why})
    return out


def _to_words(agg: dict, sw: list, surah: int, recited, n_basmala: int, spf: float) -> list[dict]:
    """Word entries in the shape align_full returns (same rounding, same keys)."""
    out = []
    for wi in sorted(agg):
        a, pos, w, _ = sw[wi]
        r = agg[wi]
        entry = {"surah": surah, "ayah": a, "position": pos, "word": w,
                 "start_ms": round(r["start"] * spf * 1000), "end_ms": round((r["end"] + 1) * spf * 1000),
                 "confidence": round(sum(r["score"]) / len(r["score"]), 3)}
        if recited is not None:
            entry["basmala"] = a == 1 and pos <= n_basmala and bool(recited)
        out.append(entry)
    return out


def required_checkpoints(duration_s: float) -> int:
    """The fail-safe's floor: one checkpoint per full 600 s (`MIN_CP_PER_S`). A file under 600 s needs none."""
    return math.floor(duration_s * PARAMS["MIN_CP_PER_S"] + 1e-9)


def anchored_align(em: torch.Tensor, surah: int, ayahs: dict, vocab: dict, blank: int, *, sec_per_frame: float,
                   windows: list[dict], skipped=(), transcribe_windows=None, pauses=None,
                   log=None) -> tuple[list[dict], bool | None, dict]:
    """The anchored pass. `windows` are the transcribed schedule ({"start_s", "end_s", "text"}, time order).

    Returns (words sorted by (ayah, position) and snapped to `pauses` as today, basmala recited or None, the
    `anchors` report without its `seconds.asr`). Raises AnchorsInsufficient when the fail-safe fires and
    RuntimeError when segmented alignment fails with no cut left.
    """
    log = log or (lambda m: print(m, file=sys.stderr))
    t0 = time.perf_counter()
    fps = 1 / sec_per_frame
    duration_s = em.shape[0] * sec_per_frame
    words0 = _words(surah, ayahs)
    _expand_muqattaat(surah, ayahs, words0, MUQATTAAT)
    n_basmala = basmala_word_count(surah, ayahs)
    recited = None
    if n_basmala:
        with torch.inference_mode():
            recited = decide_basmala(em, words0, vocab, n_basmala, blank, STAR_PENALTY)["recited"]
    n_ayahs = max(a for (s, a) in ayahs if s == surah)
    sw, tokens, wot, aow = surah_tokens(surah, ayahs, 1, n_ayahs, recited, vocab)
    if not tokens:
        raise ValueError("no alignable characters in the Tanzil text for this surah")
    tpw = [0] * len(sw)
    for wi in wot:
        tpw[wi] += 1
    keys = [k for _, _, _, k in sw]
    usable = set(usable_ayahs(surah, ayahs))
    refrains = {a for a in set(aow) if a not in usable}
    token_pace = len(tokens) / duration_s
    char_pace = len(" ".join(keys)) / duration_s

    indexed = [dict(w, idx=i) for i, w in enumerate(windows)]
    located = locate_chunks(indexed, keys, char_pace)
    kept = chain(located, tpw, token_pace)
    with torch.inference_mode():
        cps = local_checkpoints(em, kept, tokens, wot, aow, blank, fps, usable)
    real = [c for c in cps if c.ayah > 0]
    breaks = pace_breaks(kept, keys, aow, list(skipped), transcribe_windows or (lambda ws: [""] * len(ws)),
                         refrains, char_pace)
    t_locate = time.perf_counter() - t0

    need = required_checkpoints(duration_s)
    unresolved = [b for b in breaks if b["status"] == "unresolved"]
    if len(real) < need:
        raise AnchorsInsufficient(f"{len(real)} checkpoints for {duration_s:.0f} s of audio (need {need})")
    if unresolved:
        spans = ", ".join(f"{b['from_s']:.0f}-{b['to_s']:.0f} s" for b in unresolved)
        raise AnchorsInsufficient(f"unresolved pace break(s) at {spans}")

    t1 = time.perf_counter()
    cut_cps = pick_cuts(real, PARAMS["CUT_SPACING_S"], fps)
    cuts = [(c.ayah, max(1, c.frame - PARAMS["CUT_BACK_FRAMES"])) for c in cut_cps]
    with torch.inference_mode():
        agg, cuts_used, merges = align_cut(em, tokens, wot, aow, blank, cuts, log)
    words = _to_words(agg, sw, surah, recited, n_basmala, sec_per_frame)
    if pauses is not None:
        snap_to_pauses(words, pauses, window_ms=SNAP_WINDOW_MS)
    words.sort(key=lambda w: (w["ayah"], w["position"]))
    t_align = time.perf_counter() - t1

    # held-out: checkpoints that are not cuts, compared with the final (snapped) ayah starts and word starts
    first_ms: dict[int, int] = {}
    for w in words:
        if not w.get("basmala"):
            first_ms[w["ayah"]] = min(first_ms.get(w["ayah"], w["start_ms"]), w["start_ms"])
    word_ms = {(w["ayah"], w["position"]): w["start_ms"] for w in words}
    used_ayahs = {a for a, _ in cuts_used}
    cut_chunks = {c.chunk for c in cut_cps if c.ayah in used_ayahs}
    rep = _repeat_windows(located)
    held_out = [[c.ayah, round(c.frame * sec_per_frame * 1000), first_ms[c.ayah]]
                for c in real if c.ayah not in used_ayahs and c.ayah in first_ms]
    diffs = []
    refs = []  # [ayah, position, checkpoint ms, final ms]: the held-out words, for G5 (plan Q4 review decisions)
    for c in cps:
        if c.chunk in cut_chunks or c.chunk in rep:
            continue
        for wi, fr in c.words.items():
            k = (sw[wi][0], sw[wi][1])
            if k in word_ms:
                cp_ms = round(fr * sec_per_frame * 1000)
                diffs.append(abs(word_ms[k] - cp_ms))
                refs.append([k[0], k[1], cp_ms, word_ms[k]])
    refs.sort()
    tol = PARAMS["G5_TOL_MS"]
    report = {
        "asr_model": ASR_MODEL, "asr_revision": ASR_REVISION, "every": PARAMS["ASR_EVERY"],
        "windows": len(windows), "located": len(located),
        "repeats": sum(x.status == "repeat" for x in located),
        "checkpoints": [[c.ayah, round(c.frame * sec_per_frame * 1000)] for c in sorted(real, key=lambda c: c.frame)],
        "cuts": [[a, round(f * sec_per_frame * 1000)] for a, f in cuts_used],
        "merges": merges,
        "held_out": held_out,
        "held_out_words": {"n": len(diffs), "within_300ms": sum(d <= tol for d in diffs),
                           "median_ms": round(statistics.median(diffs)) if diffs else None},
        "held_out_refs": refs,
        "pace_breaks": breaks,
        "repeat_candidates": _repeat_candidates(located, aow, surah),
        "last_located_ayah": aow[max(x.we for x in kept)] if kept else None,
        "insufficient": None,
        "seconds": {"locate": round(t_locate, 1), "align": round(t_align, 1)},
    }
    return words, (None if recited is None else bool(recited)), report

"""Gate probes (ADR 0077 decision 5, plan way2quran-quality Q5): G3 ayah-start probes and the G4 word-onset screen.

Short clips are cut at the aligner's final starts, transcribed by the pinned Whisper and matched against a
local text only, so a refrain elsewhere in the surah cannot match. The transcription is injected
(`transcribe_clips`), so the rules here are testable without a model. Quran text comes from the caller
(Tanzil, read at runtime); matching keys are normalised, the text itself is never changed.
"""

import hashlib
import random
import statistics
import time
from dataclasses import dataclass, field
from typing import Callable, NamedTuple

from rapidfuzz import fuzz

from .align import MUQATTAAT
from .quality import PARAMS, tool_version
from .text import norm

OK, BAD, UNSURE = "OK", "BAD", "UNSURE"
_RANK = {OK: 0, UNSURE: 1, BAD: 2}


class Local(NamedTuple):
    n: int
    words: list  # [(normalised word, ayah, word index)]
    text: str  # the words joined with single spaces and a trailing space
    owner: list  # per character of `text`: (ayah, word index)
    last_prev: int  # index of the last word of ayah n-1, -1 if there is none


def local_text(surah: int, n: int, ayahs: dict) -> Local:
    """All of n-1, all of n and the first G3_NEXT_WORDS of n+1, normalised, each word with (ayah, index)."""
    words, text, owner = [], "", []
    prev_len = 0
    for a in (n - 1, n, n + 1):
        t = ayahs.get((surah, a))
        ws = norm(t).split() if t is not None else []
        if a == n - 1:
            prev_len = len(ws)
        if a == n + 1:
            ws = ws[:PARAMS["G3_NEXT_WORDS"]]
        for wi, w in enumerate(ws):
            words.append((w, a, wi))
            owner.extend([(a, wi)] * (len(w) + 1))
            text += w + " "
    return Local(n, words, text, owner, prev_len - 1)


def match_start(text: str, local: Local) -> dict:
    """{"verdict", "heard", "score"} for the transcript `text` of a clip cut at the start of ayah local.n.

    OK: the best match begins at word 0 of n, or in the last word of n-1 (the pre-roll), at score >= G3_SCORE.
    BAD: it begins elsewhere. UNSURE: the text is empty or scores below G3_SCORE. `heard` is "ayah:index".

    Tie-break (Q7d): when a match beginning at word 0 of n (or in the last word of n-1) scores as high as the best
    match elsewhere, the clip is OK: two ayahs with the same opening cannot be told apart by their first words, and
    the best alignment may land on the other one. A real shift between such ayahs is still caught by the probes of
    the ayahs around them (and, for refrains, by `refrain_resolve`). `tie` is true when this rule decided.
    """
    hyp = norm(text)
    if not hyp or not local.text:
        return {"verdict": UNSURE, "heard": None, "score": 0.0}
    al = fuzz.partial_ratio_alignment(hyp, local.text)
    a, wi = local.owner[min(al.dest_start, len(local.owner) - 1)]
    heard, score = f"{a}:{wi}", float(al.score)
    if score < PARAMS["G3_SCORE"]:
        return {"verdict": UNSURE, "heard": heard, "score": score}
    good = (a == local.n and wi == 0) or (a == local.n - 1 and local.last_prev >= 0 and wi >= local.last_prev)
    if not good:
        tie = _start_tie(hyp, local, score)
        if tie is not None:
            return {"verdict": OK, "heard": tie, "score": score, "tie": True}
    return {"verdict": OK if good else BAD, "heard": heard, "score": score}


def _start_tie(hyp: str, local: Local, best: float) -> str | None:
    """The key of a match that begins in the last word of n-1 or at word 0 of n and scores `best` (the best score
    anywhere in the local text), or None. Windows are as long as the transcript, as in `partial_ratio`."""
    if len(hyp) > len(local.text):
        return None
    offsets, pos = {}, 0
    for w, a, wi in local.words:
        offsets[(a, wi)] = pos
        pos += len(w) + 1
    if (local.n, 0) not in offsets:
        return None
    first = offsets.get((local.n - 1, local.last_prev), offsets[(local.n, 0)]) if local.last_prev >= 0 \
        else offsets[(local.n, 0)]
    for c in range(first, offsets[(local.n, 0)] + 1):
        if fuzz.ratio(hyp, local.text[c:c + len(hyp)]) >= best - 1e-9:
            a, wi = local.owner[c]
            return f"{a}:{wi}"
    return None


def ayah_starts(words: list[dict]) -> dict[int, float]:
    """Start of each ayah in seconds: its earliest non-basmala word."""
    ms: dict[int, int] = {}
    for w in words:
        if not w.get("basmala"):
            ms[w["ayah"]] = min(ms.get(w["ayah"], w["start_ms"]), w["start_ms"])
    return {a: v / 1000 for a, v in ms.items()}


def _clip(t: float, pre: float, post: float | None = None) -> tuple[float, float]:
    return max(0.0, t - pre), t + (PARAMS["G3_POST_S"] if post is None else post)


def word_pace(words: list[dict]) -> float:
    """Seconds per word while reciting: the mean gap between consecutive word starts inside an ayah (basmala
    excluded, so the pauses between ayahs do not count). 0.0 when no ayah holds two words."""
    by: dict[int, list[int]] = {}
    for w in _spoken(words):
        by.setdefault(w["ayah"], []).append(w["start_ms"])
    gaps = [(b - a) / 1000 for v in by.values() for a, b in zip(sorted(v), sorted(v)[1:])]
    return sum(gaps) / len(gaps) if gaps else 0.0


def g3_post(words: list[dict]) -> float:
    """Seconds a G3 clip runs after the start (Q7d, pace-adaptive): the clip holds about G3_MIN_WORDS words at the
    surah's pace, never less than the G3_PRE_S + G3_POST_S of a fast recitation and never more than G3_MAX_S. The
    pre-roll is unchanged."""
    length = min(PARAMS["G3_MAX_S"], PARAMS["G3_MIN_WORDS"] * word_pace(words))
    return round(max(PARAMS["G3_POST_S"], length - PARAMS["G3_PRE_S"]), 3)


def _run(wav, clips, transcribe_clips, batch, timing):
    t0 = time.perf_counter()
    out = transcribe_clips(wav, clips, batch=batch)["clips"]
    timing["seconds"] += time.perf_counter() - t0
    timing["clips"] += len(clips)
    return [c["text"] for c in out]


def probe_ayah_starts(wav, words: list[dict], surah: int, ayahs: dict, transcribe_clips, cuts=(), *,
                      only=None, batch: int = 1, post: float | None = None) -> dict:
    """G3: probe the start of every ayah 2..N (or of `only`).

    `words` is the aligned document's words, `ayahs` the Tanzil dict {(surah, ayah): text}, `cuts` the anchor
    cut times in seconds. A start within G3_CUT_AVOID_S of a cut is not probed; the next start that is not
    near a cut is probed instead (`moved`). A BAD or UNSURE probe is repeated at the pre-rolls in G3_REPROBE
    and the worse of those results counts. Each clip runs `post` seconds after the start (default `g3_post(words)`).

    Returns {"probes": {ayah: {"verdict", "heard", "score", "start_s", "pre_s", "initial", "reprobed",
    "text"}}, "moved": {ayah: probed ayah}, "unprobed": [ayah], "clips": int, "seconds": float}.
    """
    starts = ayah_starts(words)
    last = max(a for (s, a) in ayahs if s == surah)
    near = lambda t: any(abs(t - c) < PARAMS["G3_CUT_AVOID_S"] for c in cuts)  # noqa: E731
    wanted = [n for n in range(2, last + 1) if n in starts and (only is None or n in only)]
    targets: list[int] = []
    moved: dict[int, int] = {}
    unprobed: list[int] = []
    for n in wanted:
        m = n
        while m is not None and near(starts[m]):
            m = next((k for k in range(m + 1, last + 1) if k in starts), None)
        if m is None:
            unprobed.append(n)
            continue
        if m != n:
            moved[n] = m
        if m not in targets:
            targets.append(m)

    timing = {"seconds": 0.0, "clips": 0}
    pre = PARAMS["G3_PRE_S"]
    post = g3_post(words) if post is None else post
    locals_ = {n: local_text(surah, n, ayahs) for n in targets}
    texts = _run(wav, [_clip(starts[n], pre, post) for n in targets], transcribe_clips, batch, timing) if targets else []
    probes: dict[int, dict] = {}
    for n, text in zip(targets, texts):
        r = match_start(text, locals_[n])
        probes[n] = {**r, "start_s": starts[n], "pre_s": pre, "initial": r["verdict"], "reprobed": False,
                     "text": norm(text)}
    redo = [n for n in targets if probes[n]["verdict"] != OK]
    if redo:
        pres = PARAMS["G3_REPROBE"]
        clips = [_clip(starts[n], p, post) for n in redo for p in pres]
        again = _run(wav, clips, transcribe_clips, batch, timing)
        for i, n in enumerate(redo):
            rs = [(match_start(again[i * len(pres) + j], locals_[n]), pres[j], again[i * len(pres) + j])
                  for j in range(len(pres))]
            r, p, t = max(rs, key=lambda x: (_RANK[x[0]["verdict"]], -x[0]["score"]))
            probes[n].update({**r, "pre_s": p, "reprobed": True, "text": norm(t)})
    return {"probes": probes, "moved": moved, "unprobed": unprobed, "clips": timing["clips"],
            "seconds": round(timing["seconds"], 3)}


def refrain_resolve(results: dict, usable: dict) -> dict:
    """A refrain ayah (not in `usable`) counts only when its own probe and the nearest probed unique ayah on
    each side are OK; otherwise it is BAD if one of them is BAD, else UNSURE. Unique ayahs keep their own
    verdict. `results` is {ayah: record}; returns a copy with "raw" holding the unresolved verdict.
    """
    out = {}
    probed_unique = sorted(a for a in results if a in usable)
    for n, rec in results.items():
        new = {**rec, "refrain": n not in usable}
        if n not in usable:
            before = max((a for a in probed_unique if a < n), default=None)
            after = min((a for a in probed_unique if a > n), default=None)
            seen = [rec["verdict"]] + [results[a]["verdict"] for a in (before, after) if a is not None]
            new["raw"] = rec["verdict"]
            new["neighbours"] = [a for a in (before, after) if a is not None]
            new["verdict"] = max(seen, key=lambda v: _RANK[v])
        out[n] = new
    return out


def word_onset_probes(wav, words: list[dict], transcribe_clips, seed, *, batch: int = 1) -> dict:
    """G4 screen: k = max(G4_MIN, words/G4_PER) mid-ayah words, chosen by a sha256-seeded sample.

    The clip is [w - G4_PRE_S, w + G4_POST_S]. The transcript is matched against the words w-2..w+3 and
    the match start gives the offset in words. A word that appears twice in that context takes the
    occurrence nearest to w. exact = offset 0, pm1 = off by one word, bad = more, empty = no text.
    """
    ws = sorted((w for w in words if not w.get("basmala")), key=lambda w: w["start_ms"])
    cand = [i for i, w in enumerate(ws) if 1 < i < len(ws) - 3 and w["position"] >= 2]
    k = min(len(cand), max(PARAMS["G4_MIN"], len(ws) // PARAMS["G4_PER"]))
    rng = random.Random(int.from_bytes(hashlib.sha256(str(seed).encode("utf-8")).digest()[:8], "big"))
    pick = sorted(rng.sample(cand, k))
    timing = {"seconds": 0.0, "clips": 0}
    clips = [(max(0.0, ws[i]["start_ms"] / 1000 - PARAMS["G4_PRE_S"]),
              ws[i]["start_ms"] / 1000 + PARAMS["G4_POST_S"]) for i in pick]
    texts = _run(wav, clips, transcribe_clips, batch, timing) if clips else []
    probes, counts = [], {"exact": 0, "pm1": 0, "bad": 0, "empty": 0}
    for i, text in zip(pick, texts):
        hyp = norm(text)
        if not hyp:
            verdict, off = "empty", None
        else:
            ctx = ws[i - 2:i + 4]
            lt, lo = "", []
            for j, c in enumerate(ctx):
                nw = norm(c["word"])
                lo.extend([j - 2] * (len(nw) + 1))
                lt += nw + " "
            al = fuzz.partial_ratio_alignment(hyp, lt)
            off = lo[min(al.dest_start, len(lo) - 1)]
            if off == -1 and lo[min(al.dest_start + 2, len(lo) - 1)] == 0:
                off = 0  # the match begins in the last letters of the previous word
            if off != 0 and norm(ctx[off + 2]["word"]) == norm(ws[i]["word"]):
                off = 0  # the same word twice in the context: the nearest occurrence is w
            verdict = "exact" if off == 0 else ("pm1" if abs(off) == 1 else "bad")
        counts[verdict] += 1
        probes.append({"ayah": ws[i]["ayah"], "position": ws[i]["position"], "start_s": ws[i]["start_ms"] / 1000,
                       "offset": off, "verdict": verdict})
    return {"probes": probes, "n": len(pick), **counts, "clips": timing["clips"],
            "seconds": round(timing["seconds"], 3)}



# --- verdicts (plan way2quran-quality Q6a) -----------------------------------------------------------------------
#
# Everything below is pure: the probes, the aligned words and the anchors report come in already computed, so the
# G0-G6 table is testable without a model or the Quran text. Quran text appears nowhere in a record, only verse
# keys ("s:a"), word positions, numbers and verdict names.

SCHEMA = 1
OUTLIER_MS = 1000  # a held-out ayah checkpoint this far from the final ayah start triggers repair (decision 5)
TAIL_TOL_S = 5.0  # the tail may exceed completeness's measured trailing_s by this much (G2)
REPAIR_MARGIN = 1  # a repair region runs from ayah n - 1 to n + 1 (decision 4)


def _letters(w: dict, opening=frozenset()) -> int:
    """Normalised letters of the word. The opening letters of a surah (muqatta'at) are recited as letter names, so
    the aligner's spelled-out key counts, not the written token (`opening` holds their (surah, ayah, position))."""
    if (w["surah"], w["ayah"], w["position"]) in opening:
        return max(1, len(MUQATTAAT[(w["surah"], w["ayah"])].replace(" ", "")))
    return max(1, len(norm(w["word"]).replace(" ", "")))


def _opening(words: list[dict]) -> frozenset:
    first: dict[tuple, int] = {}
    for w in _spoken(words):
        k = (w["surah"], w["ayah"])
        if k in MUQATTAAT:
            first[k] = min(first.get(k, w["position"]), w["position"])
    return frozenset((s, a, p) for (s, a), p in first.items())


def _spoken(words: list[dict]) -> list[dict]:
    return [w for w in words if not w.get("basmala")]


def _finals(words: list[dict]) -> dict[int, int]:
    last: dict[int, int] = {}
    for w in _spoken(words):
        last[w["ayah"]] = max(last.get(w["ayah"], 0), w["position"])
    return last


def surah_pace(words: list[dict]) -> float:
    """Seconds per normalised letter over the whole recitation: the span from the first spoken word to the last
    divided by all its letters (pauses included, like the anchors' pace). 0.3 when there are no words."""
    spoken = _spoken(words)
    if not spoken:
        return 0.3
    opening = _opening(words)
    letters = sum(_letters(w, opening) for w in spoken)
    span = (max(w["end_ms"] for w in spoken) - min(w["start_ms"] for w in spoken)) / 1000
    return span / letters if span > 0 else 0.3


def stretched_words(words: list[dict], pace: float) -> list[list]:
    """Non-final words longer than STRETCH_X x (letters x `pace`) and longer than STRETCH_S seconds.

    Returns [["surah:ayah", position, duration_ms], ...]. This catches 5:31, whose confidence (0.988) G6 misses.
    The last word of an ayah may hold a pause or an elongation, so it is never counted.
    """
    final = _finals(words)
    opening = _opening(words)
    out = []
    for w in _spoken(words):
        dur = (w["end_ms"] - w["start_ms"]) / 1000
        if w["position"] >= final[w["ayah"]]:
            continue
        if dur > PARAMS["STRETCH_X"] * _letters(w, opening) * pace and dur > PARAMS["STRETCH_S"]:
            out.append([f"{w['surah']}:{w['ayah']}", w["position"], round(dur * 1000)])
    return out


def low_conf_ayahs(words: list[dict]) -> list[int]:
    """G6: ayahs whose mean word confidence (basmala excluded) is below FLOOR. These are `segments_null`."""
    conf: dict[int, list[float]] = {}
    for w in _spoken(words):
        conf.setdefault(w["ayah"], []).append(w["confidence"])
    return sorted(a for a, c in conf.items() if sum(c) / len(c) < PARAMS["FLOOR"])


def _in_regions(ayah: int, regions) -> bool:
    return any(lo <= ayah <= hi for lo, hi in regions)


def held_out_stats(anchors: dict, words: list[dict], regions=()) -> dict:
    """G5: the anchors' held-out word starts against the final words, outside the repeat `regions`.

    `anchors["held_out_refs"]` is [ayah, position, checkpoint ms, final ms] per held-out word; the final start is
    read from `words` when the word is there (a repair may have moved it; a repeated position takes its nearest
    occurrence). `regions` is a list of inclusive ayah
    ranges (found by stretch or by G3) that are set aside. n/a below G5_MIN_N words. `outlier_ayahs` are the
    held-out ayah checkpoints (`anchors["held_out"]`) more than OUTLIER_MS from the final ayah start.
    """
    final: dict[tuple, list[int]] = {}
    for w in words:
        final.setdefault((w["ayah"], w["position"]), []).append(w["start_ms"])
    diffs, set_aside = [], 0
    for ayah, pos, cp_ms, fin_ms in anchors.get("held_out_refs", []):
        if _in_regions(ayah, regions):
            set_aside += 1
            continue
        # a repeated position (Q7b) is compared with its nearest occurrence: the expanded sequence, not the last pass
        diffs.append(min(abs(t - cp_ms) for t in final.get((ayah, pos), [fin_ms])))
    starts = {a: round(t * 1000) for a, t in ayah_starts(words).items()}
    outliers = sorted(a for a, cp_ms, fin_ms in anchors.get("held_out", [])
                      if not _in_regions(a, regions) and abs(starts.get(a, fin_ms) - cp_ms) > OUTLIER_MS)
    n = len(diffs)
    share = sum(d <= PARAMS["G5_TOL_MS"] for d in diffs) / n if n else None
    median = round(statistics.median(diffs)) if n else None
    if n < PARAMS["G5_MIN_N"]:
        status = "n/a"
    elif share >= PARAMS["G5_SHARE"] and median <= PARAMS["G5_MEDIAN_MS"]:
        status = "pass"
    else:
        status = "fail"
    return {"n": n, "share_300ms": None if share is None else round(share, 4), "median_ms": median,
            "status": status, "set_aside": set_aside, "outlier_ayahs": outliers}


PRE_ROLL_CHARS = 3  # a last-word match may begin this many characters before the word (a clipped prefix)


def _last_word_verdict(text: str, ctx: list[str]) -> dict:
    """G2: a clip cut at the last word's start is OK when the match begins in that word, or in the last
    PRE_ROLL_CHARS characters before it (the recitation often adds a short prefix), and ends in it.
    `ctx` is the last few normalised words of the surah. Empty text or a score below G3_SCORE is UNSURE.
    """
    hyp = norm(text)
    if not hyp:
        return {"verdict": UNSURE, "score": 0.0}
    joined = " ".join(ctx) + " "
    al = fuzz.partial_ratio_alignment(hyp, joined)
    score = float(al.score)
    if score < PARAMS["G3_SCORE"]:
        return {"verdict": UNSURE, "score": score}
    word_start = len(joined) - len(ctx[-1]) - 1
    good = al.dest_start >= word_start - PRE_ROLL_CHARS and al.dest_end > word_start
    return {"verdict": OK if good else BAD, "score": score}


def _onset_verdict(text: str, ctx: list[str], j: int) -> dict:
    """Q7e: a clip cut at the onset of word ctx[j] is OK when the match begins in that word (or in the last
    PRE_ROLL_CHARS characters before it) at score >= G3_SCORE; BAD when it begins elsewhere; UNSURE on empty text or a
    low score. `ctx` is the normalised words around it, in recited order."""
    hyp = norm(text)
    if not hyp:
        return {"verdict": UNSURE, "score": 0.0}
    joined = " ".join(ctx) + " "
    al = fuzz.partial_ratio_alignment(hyp, joined)
    score = float(al.score)
    if score < PARAMS["G3_SCORE"]:
        return {"verdict": UNSURE, "score": score}
    start = sum(len(w) + 1 for w in ctx[:j])
    good = start - PRE_ROLL_CHARS <= al.dest_start < start + len(ctx[j]) and al.dest_end > start
    return {"verdict": OK if good else BAD, "score": score}


def end_coverage(wav, words: list[dict], surah: int, ayahs: dict, transcribe_clips, g3_probes: dict, completeness: dict,
                 duration_s: float, *, batch: int = 1, post: float | None = None) -> dict:
    """G2: the last ayah start and the last word start are probed OK, and the tail after the last word is at most
    TAIL_MAX_S or no longer than completeness's measured `trailing_s` (+ TAIL_TOL_S).

    The last ayah reuses its G3 probe when there is one; otherwise it is probed here with no cut to avoid.
    """
    spoken = sorted(_spoken(words), key=lambda w: (w["ayah"], w["position"]))
    last_ayah = spoken[-1]["ayah"]
    timing = {"seconds": 0.0, "clips": 0}
    probe = g3_probes.get(last_ayah)
    if probe is None:
        r = probe_ayah_starts(wav, words, surah, ayahs, transcribe_clips, (), only={last_ayah}, batch=batch, post=post)
        probe = r["probes"].get(last_ayah)
        timing["seconds"] += r["seconds"]
        timing["clips"] += r["clips"]
    last = spoken[-1]
    t = last["start_ms"] / 1000
    texts = _run(wav, [(max(0.0, t - PARAMS["G4_PRE_S"]), t + PARAMS["G4_POST_S"])], transcribe_clips, batch, timing)
    ctx = [norm(w["word"]) for w in spoken[-4:]]
    word = _last_word_verdict(texts[0], ctx)
    long_used = False
    if word["verdict"] != OK:
        # Q7d: an elongated last word does not fit the short clip; one longer clip (as long as a G3 clip) is tried.
        # The rule is the same: the match must begin in the last word, so an early or late start still fails.
        long = _run(wav, [(max(0.0, t - PARAMS["G4_PRE_S"]), t + _last_word_post(post))], transcribe_clips, batch,
                    timing)
        again = _last_word_verdict(long[0], ctx)
        if again["verdict"] == OK:
            word, long_used = again, True
    tail_s = round(duration_s - max(w["end_ms"] for w in spoken) / 1000, 1)
    trailing = completeness.get("trailing_s") or 0.0
    tail_ok = tail_s <= PARAMS["TAIL_MAX_S"] or tail_s <= trailing + TAIL_TOL_S
    ayah_verdict = probe["verdict"] if probe else UNSURE
    ok = ayah_verdict == OK and word["verdict"] == OK and tail_ok
    out = {"last_ayah": ayah_verdict, "last_word": word["verdict"], "last_word_score": word["score"],
           "tail_s": tail_s, "tail_ok": tail_ok, "status": "pass" if ok else "fail",
           "clips": timing["clips"], "seconds": round(timing["seconds"], 3)}
    if long_used:
        out["last_word_clip"] = "long"
    return out


def _last_word_post(post: float | None) -> float:
    """Seconds the long last-word clip runs after the word's start: a G3 clip's length, at least G4_POST_S."""
    return max(PARAMS["G4_POST_S"], PARAMS["G3_POST_S"] if post is None else post)


def _consecutive_failures(failed: list[int], probed: list[int]) -> int:
    """The longest run of failed probes among `probed` (sorted ayahs), taken in probe order."""
    best = run = 0
    bad = set(failed)
    for a in probed:
        run = run + 1 if a in bad else 0
        best = max(best, run)
    return best


def middle_gap(anchors: dict, g3_results: dict) -> dict:
    """The middle-gap signal (ADR 0077 decision 2a). `g3_results` is {ayah: {"verdict", ...}} after refrain
    resolution. A pace break is one the anchors report calls a `jump`; the other breaks are only flags. The surah
    is unavailable (`incomplete-middle`) only when a jump break also holds GAP_G3_RUN or more consecutive G3
    failures (BAD or UNSURE) on the ayahs inside it. Neither signal alone makes it unavailable.
    """
    breaks = []
    for b in anchors.get("pace_breaks", []):
        lo, hi = sorted((b["from_ayah"], b["to_ayah"]))
        probed = sorted(a for a in g3_results if lo <= a <= hi)
        failed = [a for a in probed if g3_results[a]["verdict"] != OK]
        run = _consecutive_failures(failed, probed)
        breaks.append({"from_ayah": lo, "to_ayah": hi, "status": b["status"], "pace_x": b.get("pace_x"),
                       "g3_failed": len(failed), "g3_run": run})
    unavailable = any(b["status"] == "jump" and b["g3_run"] >= PARAMS["GAP_G3_RUN"] for b in breaks)
    return {"flag": any(b["status"] == "jump" for b in breaks), "breaks": breaks, "unavailable": unavailable}


def g3_summary(results: dict, unprobed=(), moved=None) -> dict:
    """The G3 check: counts over the probed ayahs (after refrain resolution) and the failed ayahs."""
    failed = sorted(a for a, r in results.items() if r["verdict"] != OK)
    return {"n": len(results), "ok": len(results) - len(failed),
            "bad": sum(r["verdict"] == BAD for r in results.values()),
            "unsure": sum(r["verdict"] == UNSURE for r in results.values()),
            "failed": failed, "unprobed": sorted(unprobed), "moved": {str(k): v for k, v in (moved or {}).items()}}


def g4_summary(g4: dict) -> dict:
    """The G4 check, a screen only: it never decides a verdict."""
    bad = [f"{p['ayah']}:{p['position']}" for p in g4["probes"] if p["verdict"] == "bad"]
    return {"n": g4["n"], "exact": g4["exact"], "pm1": g4["pm1"], "bad": g4["bad"], "empty": g4["empty"],
            "triggered": [], "bad_at": bad}


def _pause_check(pauses, words: list[dict], ayah_count: int) -> dict:
    """Report only. Density is n/a below 0.8 pauses per ayah."""
    if pauses is None:
        return {"pauses": None, "density": None, "share_07": None, "status": "n/a"}
    density = len(pauses) / max(1, ayah_count)
    if density < 0.8:
        return {"pauses": len(pauses), "density": round(density, 2), "share_07": None, "status": "n/a"}
    starts = [t for a, t in ayah_starts(words).items() if a >= 2]
    near = sum(any(s - 0.7 <= t <= e + 0.7 for s, e in pauses) for t in starts)
    return {"pauses": len(pauses), "density": round(density, 2),
            "share_07": round(near / len(starts), 3) if starts else None, "status": "report"}


def _skipped(reason: str) -> dict:
    return {"status": "skipped", "reason": reason}


def _record(surah: int, completeness: dict, verdict: str, reasons: list[str], checks: dict, **extra) -> dict:
    return {"schema": SCHEMA, "surah": surah, "sha256": completeness["sha256"], "tool_version": tool_version(),
            "verdict": verdict, "reasons": reasons, "checks": checks, "repairs": extra.pop("repairs", []),
            "segments_null": extra.pop("segments_null", []), "cross_ayah": extra.pop("cross_ayah", []),
            "probes": extra.pop("probes", []), "seconds": extra.pop("seconds", {})}


def surah_verdict(surah: int, completeness: dict, *, refusal: dict | None = None, words: list[dict] | None = None,
                  anchors: dict | None = None, g2: dict | None = None, g3: dict | None = None,
                  g4: dict | None = None, pauses=None, seconds: dict | None = None, repairs: list | None = None,
                  repair_null=(), cross_ayah=(), elongations=None) -> dict:
    """The gate record of one surah (ADR 0077 decision 5). Precedence:

    1. G0: completeness is not `complete` -> `unavailable`, reason = the completeness verdict.
    2. G1: the aligner or the anchors refused -> `no_highlight`, reason `G1`.
    3. The middle gap (a pace-break jump with >= GAP_G3_RUN consecutive G3 failures inside it) -> `unavailable`,
       reason `incomplete-middle`. A pace break alone is only a flag (`checks.middle_gap`).
    4. Anything that needs repair (a G3 BAD or UNSURE, a stretched word, G2 failing, G5 failing or a held-out
       ayah checkpoint more than 1 s from the final start) -> `no_highlight`, reason `needs-repair`. Q7b replaces
       this with the repair stage.
    5. More than NULL_SHARE of the ayahs below the G6 floor -> `no_highlight`, reason `segments-null-share`.
    6. Otherwise `pass`; the ayahs below the floor are `segments_null`.

    With `repairs` (the repair stage ran, plan Q7b; `words`, `g3` and `g2` are then the repaired ones):
    - step 4 becomes: anything still needing repair -> `no_highlight`, reason `repair-failed`, except that a run of
      GAP_G3_RUN or more consecutive G3 failures left after repair is `unavailable` (`incomplete-middle`): audio with
      a hole is never shipped (Q6a review decisions);
    - `repair_null` (P6 cross-ayah ayahs, REPEAT_MODE "null" regions) join the G6 ayahs in `segments_null` and in
      the NULL_SHARE count; `cross_ayah` is recorded for R7;
    - the verdict is `repaired` when at least one repair was accepted, else `pass`;
    - `elongations` ([key, position, ms, score], Q7d) are stretched words verified as elongations: they are listed in
      `checks.stretch.elongations` and are no longer a reason to fail.

    `g3` is {"results": {ayah: record} (after refrain resolution), "unprobed": [...], "moved": {...}}; `g2` is
    `end_coverage`'s result; `g4` is `word_onset_probes`' result. A record carries verdicts, keys and numbers only.
    """
    seconds = seconds or {}
    skipped = {k: _skipped("not run") for k in ("G2", "G3", "G4", "G5", "G6", "stretch", "pause", "middle_gap")}
    if completeness["verdict"] != "complete":
        return _record(surah, completeness, "unavailable", [completeness["verdict"]],
                       {"G0": completeness["verdict"], "G1": "not run", **skipped})
    if refusal is not None:
        return _record(surah, completeness, "no_highlight", ["G1"],
                       {"G0": "complete", "G1": f"refused ({refusal['stage']})", **skipped})
    results = (g3 or {}).get("results", {})
    gap = middle_gap(anchors or {}, results)
    pace = surah_pace(words)
    stretch = stretched_words(words, pace)
    g3_failed = sorted(a for a, r in results.items() if r["verdict"] != OK)
    regions = [(a - REPAIR_MARGIN, a + REPAIR_MARGIN) for a in g3_failed]
    regions += [(int(k.split(":")[1]) - REPAIR_MARGIN, int(k.split(":")[1]) + REPAIR_MARGIN) for k, _, _ in stretch]
    g5 = held_out_stats(anchors or {}, words, regions)
    nulls = sorted(set(low_conf_ayahs(words)) | set(repair_null))
    ayah_count = completeness["ayah_count"]
    checks = {
        "G0": "complete", "G1": "ok",
        "G2": g2 or _skipped("not run"),
        "G3": g3_summary(results, (g3 or {}).get("unprobed", ()), (g3 or {}).get("moved")),
        "G4": g4_summary(g4) if g4 else _skipped("not run"),
        "G5": g5,
        "G6": {"low_conf_ayahs": nulls, "share": round(len(nulls) / max(1, ayah_count), 4)},
        "stretch": {"words": stretch, "pace_s_per_letter": round(pace, 4)},
        "pause": _pause_check(pauses, words, ayah_count),
        "middle_gap": gap,
    }
    probes = [[f"{surah}:{a}", r.get("heard"), r["verdict"], round(r.get("score", 0))]
              for a, r in sorted(results.items()) if r["verdict"] != OK]
    if elongations is not None:
        checks["stretch"]["elongations"] = [list(e) for e in elongations]
        verified = {(e[0], e[1]) for e in elongations}
        stretch_fail = [x for x in stretch if (x[0], x[1]) not in verified]
    else:
        stretch_fail = stretch
    triggers = {"G3": g3_failed, "stretch": [k for k, _, _ in stretch_fail],
                "G2": bool(g2 and g2.get("status") == "fail"), "G5": g5["status"] == "fail",
                "G5_outliers": g5["outlier_ayahs"]}
    checks["triggers"] = triggers
    extra = {"probes": probes, "seconds": seconds, "segments_null": nulls}
    if repairs is not None:
        extra.update(repairs=list(repairs), cross_ayah=list(cross_ayah))
    if gap["unavailable"]:
        return _record(surah, completeness, "unavailable", ["incomplete-middle"], checks, **{**extra, "segments_null": []})
    if repairs is not None and _consecutive_failures(g3_failed, sorted(results)) >= PARAMS["GAP_G3_RUN"]:
        return _record(surah, completeness, "unavailable", ["incomplete-middle"], checks, **{**extra, "segments_null": []})
    if g3_failed or stretch_fail or triggers["G2"] or triggers["G5"] or g5["outlier_ayahs"]:
        reason = "needs-repair" if repairs is None else "repair-failed"
        return _record(surah, completeness, "no_highlight", [reason], checks, **{**extra, "segments_null": []})
    if len(nulls) > PARAMS["NULL_SHARE"] * ayah_count:
        return _record(surah, completeness, "no_highlight", ["segments-null-share"], checks,
                       **{**extra, "segments_null": []})
    if repairs is not None and any(r.get("accepted") for r in repairs):
        return _record(surah, completeness, "repaired", [], checks, **extra)
    return _record(surah, completeness, "pass", [], checks, **extra)


# --- repair (plan way2quran-quality Q7b) --------------------------------------------------------------------------
#
# Repair runs per region before the final verdict (ADR 0077 decision 5): the repeat-aware stage (`repeats`), or, for
# a late or early start that is not a repeat, stepped probes and the CTC onset after the probe point. A repair is
# accepted only when the whole region then passes G3, G5 and the stretch check (and G2 when it holds the last ayah).
# The emissions, the transcriptions and the dense ASR come in through `RepairContext`, so the rules are testable with
# fakes. Records carry keys and numbers only.

STEP_MAX_S = 10.0  # stepped probes go at most this far from the aligner's start


@dataclass
class RepairContext:
    surah: int
    ayahs: dict
    wav: object
    em: object  # emissions [T, V] (torch.Tensor)
    vocab: dict
    blank: int
    spf: float  # seconds per emission frame
    transcribe_clips: Callable
    dense: Callable  # dense(windows [(start_s, end_s)]) -> [text]
    completeness: dict
    duration_s: float
    anchors: dict = field(default_factory=dict)
    usable: object = ()
    cuts: tuple = ()
    pauses: list | None = None
    pace: float = 0.3
    batch: int = 1
    back_penalty: float | None = None
    repeat_mode: str | None = None
    g3_post: float | None = None  # the surah's G3 clip length after the start (None: G3_POST_S)


def _steps(direction: int) -> list[float]:
    """Offsets in seconds: STEP_PROBE_S apart up to STEP_MAX_S, one way, or alternating when the way is unknown."""
    step = PARAMS["STEP_PROBE_S"]
    k = int(round(STEP_MAX_S / step))
    if direction:
        return [direction * i * step for i in range(1, k + 1)]
    return [s * i * step for i in range(1, k + 1) for s in (-1, 1)]


def start_direction(probe: dict | None, n: int) -> int:
    """Where to step from a failed G3 probe of ayah n: +1 (later) when the clip heard an earlier ayah, -1 (earlier)
    when it heard ayah n past its first word or a later ayah, 0 (both ways) when nothing usable was heard."""
    heard = (probe or {}).get("heard")
    if not heard:
        return 0
    a, wi = (int(x) for x in str(heard).split(":"))
    if a < n:
        return 1
    if a > n or wi > 0:
        return -1
    return 0


def repair_start(wav, words: list[dict], surah: int, n: int, ayahs: dict, transcribe_clips, *, probe=None,
                 batch: int = 1, post: float | None = None) -> dict:
    """Stepped probes for the start of ayah n: clips [t - G3_PRE_S, t + G3_POST_S] at STEP_PROBE_S steps from the
    aligner's start, in the direction `start_direction` gives, until the clip's match begins at n:0 at a score of at
    least STEP_SCORE. Returns {"clip_s": the clip start of that probe or None, "probes": clips used, "score"}."""
    starts = ayah_starts(words)
    local = local_text(surah, n, ayahs)
    pre = PARAMS["G3_PRE_S"]
    timing = {"seconds": 0.0, "clips": 0}

    def judge(ts):
        texts = _run(wav, [_clip(t, pre, post) for t in ts], transcribe_clips, batch, timing)
        out = []
        for t, text in zip(ts, texts):
            r = match_start(text, local)
            out.append((t, r["heard"] == f"{n}:0", r["score"]))
        return out

    t = _stepped(starts[n], _steps(start_direction(probe, n)), pre, judge, batch)
    return {"clip_s": None if t is None else round(t[0] - pre, 3), "probes": timing["clips"],
            "score": None if t is None else t[1]}


def _stepped(t0: float, offsets: list[float], pre: float, judge, batch: int):
    """The stepped search shared by the start and end repairs: probe t0 + each offset in order; the first time whose
    clip is heard as the target at STEP_SCORE wins. When none is, the same offsets shifted by half a step are probed
    (Q7d: Whisper may hear the target cleanly only between two coarse steps, as at 62:017's last word; the score
    threshold is unchanged). `judge(times) -> [(time, heard as the target, score)]`. Returns (time, score) or None."""
    size = max(1, int(batch))
    half = PARAMS["STEP_PROBE_S"] / 2
    shifted = [d - half if d > 0 else d + half for d in offsets]
    for grid in (offsets, shifted):
        for j in range(0, len(grid), size):
            ts = [t0 + d for d in grid[j:j + size] if t0 + d - pre >= 0]
            for t, hit, score in (judge(ts) if ts else []):
                if hit and score >= PARAMS["STEP_SCORE"]:
                    return t, score
    return None


def repair_last_word(wav, words: list[dict], transcribe_clips, *, batch: int = 1, post: float | None = None) -> dict:
    """The end repair (G2): stepped probes [t - G4_PRE_S, t + the long last-word clip] around the last word's start,
    both ways, until the clip is heard as that word (`_last_word_verdict` OK) at a score of at least STEP_SCORE.
    The long clip (Q7d) holds an elongated last word, which the short G4 clip cuts off."""
    spoken = sorted(_spoken(words), key=lambda w: (w["ayah"], w["start_ms"]))
    ctx = [norm(w["word"]) for w in spoken[-4:]]
    t0 = spoken[-1]["start_ms"] / 1000
    timing = {"seconds": 0.0, "clips": 0}
    pre = PARAMS["G4_PRE_S"]

    def judge(ts):
        texts = _run(wav, [(t - pre, t + _last_word_post(post)) for t in ts], transcribe_clips, batch, timing)
        out = []
        for t, text in zip(ts, texts):
            r = _last_word_verdict(text, ctx)
            out.append((t, r["verdict"] == OK, r["score"]))
        return out

    t = _stepped(t0, _steps(0), pre, judge, batch)
    return {"clip_s": None if t is None else round(t[0] - pre, 3), "probes": timing["clips"],
            "score": None if t is None else t[1]}


def _frame(ms: float, spf: float) -> int:
    return round(ms / 1000 / spf)


def _splice(words: list[dict], region, new: list[dict], pauses) -> list[dict]:
    """A copy of `words` with the region's spoken words replaced by `new`, sorted by (ayah, start_ms), and the
    boundaries from ayah lo - 1 to hi + 1 snapped to the pauses again (`snap.py` unchanged)."""
    from .snap import SNAP_WINDOW_MS, snap_to_pauses

    keep = [dict(w) for w in words if w.get("basmala") or not region.lo <= w["ayah"] <= region.hi]
    out = sorted(keep + [dict(w) for w in new], key=lambda w: (w["ayah"], w["start_ms"]))
    if pauses:
        near = [w for w in out if region.lo - 1 <= w["ayah"] <= region.hi + 1]
        snap_to_pauses(near, pauses, window_ms=SNAP_WINDOW_MS)
        out.sort(key=lambda w: (w["ayah"], w["start_ms"]))
    return out


def _region_g5(anchors: dict, words: list[dict], lo: int, hi: int) -> dict:
    inside = {**anchors, "held_out_refs": [r for r in anchors.get("held_out_refs", []) if lo <= r[0] <= hi],
              "held_out": [h for h in anchors.get("held_out", []) if lo <= h[0] <= hi]}
    return held_out_stats(inside, words)


def _structure_ok(words: list[dict], lo: int, hi: int) -> bool:
    """What `export.build_surah` needs around the region: every word has start < end, and ayah starts increase."""
    if any(w["start_ms"] >= w["end_ms"] for w in _spoken(words) if lo <= w["ayah"] <= hi):
        return False
    starts = ayah_starts(words)
    seq = [starts[a] for a in sorted(starts) if lo - 1 <= a <= hi + 1]
    return all(b > a for a, b in zip(seq, seq[1:]))


def verify_elongation(ctx: RepairContext, words: list[dict], key: str, position: int, dur_ms: int, resolved: dict,
                      g2: dict | None) -> dict | None:
    """A stretched word with no repeat behind it (Q7d): accepted as a verified elongation only when
    - dense ASR over the word's own span hears that word (normalised, ratio >= ELONG_SCORE) and no other word of
      the local text (ayahs n - 1 .. n + 1) at that score, and
    - the G3 starts on both sides are OK: ayah n's (ayah 1 has none) and ayah n + 1's; for the last ayah, G2 passes.
    Returns {"key", "position", "dur_ms", "score"} or None. Keys and numbers only."""
    n = int(key.split(":")[1])
    cand = [w for w in _spoken(words) if w["ayah"] == n and w["position"] == position]
    if not cand:
        return None
    w = min(cand, key=lambda x: abs((x["end_ms"] - x["start_ms"]) - dur_ms))
    last = max(x["ayah"] for x in _spoken(words))
    if n >= 2 and (n not in resolved or resolved[n]["verdict"] != OK):
        return None
    if n < last and (n + 1 not in resolved or resolved[n + 1]["verdict"] != OK):
        return None
    if n == last and (g2 is None or g2.get("status") != "pass"):
        return None
    target = norm(w["word"])
    others = {k for a in (n - 1, n, n + 1) if (ctx.surah, a) in ctx.ayahs
              for k in norm(ctx.ayahs[(ctx.surah, a)]).split() if k != target}
    heard = norm(ctx.dense([(w["start_ms"] / 1000, w["end_ms"] / 1000)])[0]).split()
    limit = PARAMS["ELONG_SCORE"]
    scores = [fuzz.ratio(h, target) for h in heard]
    if not scores or max(scores) < limit:
        return None
    if any(sc < limit and any(fuzz.ratio(h, o) >= limit for o in others) for h, sc in zip(heard, scores)):
        return None
    return {"key": key, "position": position, "dur_ms": dur_ms, "score": round(max(scores), 1)}


def _evaluate(ctx: RepairContext, region, cand: list[dict], raw: dict, before: dict,
              old_words: list[dict] | None = None, repeat_ayahs=()) -> tuple[list, dict, dict]:
    """Re-probe the region on the candidate words. Returns (failures, the re-probed raw G3 records, G2 or None).

    Besides G3, stretch, G5 and G2, an ayah of the region that raised no trigger must keep its start within
    G5_TOL_MS: the repair is for the focus ayahs, and a moved neighbour means the region was misread. A neighbour
    that is not a focus of this region and failed G3 (or held a stretched word) before, unmoved, is left to its
    own region: it is not this repair's failure, and it still fails the surah's verdict.
    """
    lo, hi = region.lo, region.hi
    fails: list[str] = []
    if not _structure_ok(cand, lo, hi):
        return ["structure"], {}, None
    after = ayah_starts(cand)
    was_failing = {a for a, rec in (refrain_resolve(raw, ctx.usable) if raw else {}).items() if rec["verdict"] != OK}
    # a trusted neighbour (not a focus, G3 OK before) must not move; a neighbour that failed G3 before may move, and
    # must then pass G3 and stretch like a focus ayah (it is no longer "inherited" below)
    fails += [f"moved {ctx.surah}:{a}" for a in range(lo, hi + 1)
              if a not in region.focus and a not in was_failing and a in before and a in after
              and abs(after[a] - before[a]) * 1000 > PARAMS["G5_TOL_MS"]]
    last = max(w["ayah"] for w in _spoken(cand))
    r = probe_ayah_starts(ctx.wav, cand, ctx.surah, ctx.ayahs, ctx.transcribe_clips, ctx.cuts,
                          only=set(range(max(2, lo), hi + 1)), batch=ctx.batch, post=ctx.g3_post)
    merged = {**raw, **r["probes"]}
    resolved = refrain_resolve(merged, ctx.usable)
    old_resolved = refrain_resolve(raw, ctx.usable) if raw else {}

    def inherited(a, failed_before):
        return (a not in region.focus and failed_before and a in before and a in after
                and abs(after[a] - before[a]) * 1000 <= PARAMS["G5_TOL_MS"])

    fails += [f"G3 {ctx.surah}:{a}" for a in sorted(resolved) if lo <= a <= hi and resolved[a]["verdict"] != OK
              and not inherited(a, a in old_resolved and old_resolved[a]["verdict"] != OK)]
    g2 = None
    if hi == last:
        g2 = end_coverage(ctx.wav, cand, ctx.surah, ctx.ayahs, ctx.transcribe_clips, resolved, ctx.completeness,
                          ctx.duration_s, batch=ctx.batch, post=ctx.g3_post)
        if g2["status"] != "pass":
            fails.append("G2")
    old_stretch = {k for k, _, _ in stretched_words(old_words, ctx.pace)} if old_words is not None else set()
    for k, pos, dur in stretched_words(cand, ctx.pace):
        a = int(k.split(":")[1])
        if not lo <= a <= hi or inherited(a, k in old_stretch):
            continue
        if a not in repeat_ayahs and verify_elongation(ctx, cand, k, pos, dur, resolved, g2) is not None:
            continue  # a verified elongation, not a failure (recorded by run_repairs)
        fails.append(f"stretch {k}")
    g5 = _region_g5(ctx.anchors, cand, lo, hi)
    if g5["status"] == "fail" or g5["outlier_ayahs"]:
        fails.append("G5")
    return fails, r["probes"], g2


def _outcome(rp, surah: int, seq: list[int], word_ayah: list[int], mode: str,
             new: list[dict] | None = None) -> tuple[list[int], list[dict]]:
    """(segments_null ayahs, cross-ayah entries) of an accepted repeat. A cross-ayah back-jump (P6) nulls ayahs n-1
    and n and is recorded as not represented (R7). REPEAT_MODE "null" (P14) nulls every ayah that would carry
    repeated positions. In "positions" mode an ayah whose repeated positions hold an occurrence below FLOOR
    confidence (Q7d) is nulled too: its highlight could rest on a squeezed pass."""
    null, cross = [], []
    count: dict[tuple, int] = {}
    for w in new or []:
        count[(w["ayah"], w["position"])] = count.get((w["ayah"], w["position"]), 0) + 1
    null += [w["ayah"] for w in new or [] if count[(w["ayah"], w["position"])] > 1 and w["confidence"] < PARAMS["FLOOR"]]
    for a, b in rp.back_jumps(seq):
        if word_ayah[b] < word_ayah[a]:
            null += [word_ayah[b], word_ayah[a]]
            entry = {"from": f"{surah}:{word_ayah[b]}", "to": f"{surah}:{word_ayah[a]}", "represented": False}
            if entry not in cross:
                cross.append(entry)
    if mode == "null":
        null += _repeat_ayahs(rp, seq, word_ayah)
    return sorted(set(null)), cross


def _repeat_ayahs(rp, seq: list[int], word_ayah: list[int]) -> list[int]:
    """The ayahs a back-jump leaves or lands in: the ones that carry repeated positions."""
    return sorted({word_ayah[a] for a, _ in rp.back_jumps(seq)} | {word_ayah[b] for _, b in rp.back_jumps(seq)})


def repair_region(ctx: RepairContext, region, words: list[dict], raw: dict, g2_old: dict | None = None) -> dict:
    """Repair one region (a `repeats.Region`). `raw` is the G3 probes before refrain resolution.

    1. Dense ASR, the recited sequence and its class. A back-jump confirmed by CTC (`confirm_ctc`) is re-aligned
       with one entry per occurrence (`realign_region`).
    2. Otherwise (or when that fails), a failing ayah start (raw G3 BAD or UNSURE) is searched by `repair_start`,
       and a failing end (G2) by `repair_last_word`; the region is re-aligned at those points (`realign_cuts`).
    3. Each candidate is accepted only if `_evaluate` finds no failure.

    Returns {"entry": the repair record (None for a candidate-only region where nothing was found), "words": the
    accepted words or None, "probes": the re-probed raw G3 records, "g2": the new G2 or None, "null": ayahs to
    write without segments, "cross": cross-ayah entries}.
    """
    from . import repeats as rp

    surah, lo, hi = ctx.surah, region.lo, region.hi
    f0 = max(0, _frame(region.start_ms, ctx.spf) - PARAMS["CUT_BACK_FRAMES"])
    f1 = min(int(ctx.em.shape[0]), _frame(region.end_ms, ctx.spf) - PARAMS["CUT_BACK_FRAMES"])
    rt = rp.region_text(surah, ctx.ayahs, lo, hi, ctx.vocab, f0=f0, f1=f1, spf=ctx.spf)
    plain = list(range(len(rt.sw)))
    before = ayah_starts(words)
    penalty = PARAMS["BACK_PENALTY"] if ctx.back_penalty is None else ctx.back_penalty
    mode = PARAMS["REPEAT_MODE"] if ctx.repeat_mode is None else ctx.repeat_mode

    texts = ctx.dense(rp.dense_windows(region))
    asr_words = rp.stitch_windows([norm(t).split() for t in texts])
    seq = rp.recited_sequence(asr_words, rt.keys, penalty)
    kind = rp.classify(seq, rt.word_ayah)
    key = lambda wi: f"{rt.sw[wi][0]}:{rt.sw[wi][1]}"  # noqa: E731
    entry = {"region": region.key(surah), "trigger": list(region.triggers), "kind": kind, "ctc_margin": None,
             "jumps": [[key(a), key(b)] for a, b in rp.back_jumps(seq)], "steps": 0, "accepted": False,
             "failed": []}
    failing = [n for n in region.focus if n in raw and raw[n]["verdict"] != OK]
    focus = (failing or region.focus or [lo])[0]  # the ayah the before/after starts report: a failing start first
    entry["before_start_ms"] = round(before.get(focus, 0) * 1000)
    result = {"entry": entry, "words": None, "probes": {}, "g2": None, "null": [], "cross": []}

    def finish(cand, probes, g2, used_kind, null=(), cross=()):
        entry.update(kind=used_kind, accepted=True, failed=[])
        after = ayah_starts(cand)
        entry["after_start_ms"] = round(after.get(focus, 0) * 1000)
        entry["starts"] = {str(a): [round(before[a] * 1000), round(after[a] * 1000)]
                           for a in range(lo - 1, hi + 2) if a in before and a in after}
        entry["null"], entry["cross"] = sorted(set(null)), list(cross)
        result.update(words=cand, probes=probes, g2=g2, null=entry["null"], cross=entry["cross"])
        return result

    confirmed = None
    if kind != "none":
        seq, checked = rp.confirm_jumps(ctx.em, rt, seq, ctx.blank)
        entry["jumps"] = [[key(j["from"]), key(j["to"]), j["margin"], j["accepted"]] for j in checked]
        margins = [j["margin"] for j in checked if j["accepted"]] or [j["margin"] for j in checked
                                                                         if j["margin"] is not None]
        entry["ctc_margin"] = min(margins) if any(j["accepted"] for j in checked) else (max(margins) if margins else None)
        kind = rp.classify(seq, rt.word_ayah)
        if kind != "none":
            confirmed = seq
            try:
                new = rp.realign_region(ctx.em, rt, seq, ctx.blank)
            except (RuntimeError, ValueError):
                entry["failed"].append("align")
            else:
                cand = _splice(words, region, new, ctx.pauses)
                fails, probes, g2 = _evaluate(ctx, region, cand, raw, before, words,
                                              _repeat_ayahs(rp, seq, rt.word_ayah))
                if not fails:
                    return finish(cand, probes, g2, kind, *_outcome(rp, surah, seq, rt.word_ayah, mode, new))
                entry["failed"] += fails
                entry["tried_start_ms"] = round(ayah_starts(cand).get(focus, 0) * 1000)
        else:
            entry["failed"].append("ctc")
            entry["kind"] = "none"

    if not region.failing:
        return {**result, "entry": entry if confirmed is not None else None}

    # a late or early start, or the end, that is not (only) a repeat: stepped probes, then the CTC onset after them
    base = confirmed if confirmed is not None else plain
    cuts = []
    repeated = set(_repeat_ayahs(rp, base, rt.word_ayah))
    for n in region.focus:
        if n < 2 or n < lo or n > hi or n not in raw or raw[n]["verdict"] == OK:
            continue
        if n in repeated:
            continue  # its first occurrence is set by the recited sequence; a probe could land on a later pass
        found = repair_start(ctx.wav, words, surah, n, ctx.ayahs, ctx.transcribe_clips, probe=raw[n],
                             batch=ctx.batch, post=ctx.g3_post)
        entry["steps"] += found["probes"]
        if found["clip_s"] is not None:
            k = next(k for k, wi in enumerate(base) if rt.word_ayah[wi] == n)
            cuts.append((k, found["clip_s"]))
    if "G2" in region.triggers and g2_old is not None and g2_old.get("last_word") != OK:
        found = repair_last_word(ctx.wav, words, ctx.transcribe_clips, batch=ctx.batch, post=ctx.g3_post)
        entry["steps"] += found["probes"]
        if found["clip_s"] is not None:
            cuts.append((len(base) - 1, found["clip_s"]))
    if not cuts:
        # stepped probes ran and never heard the opening, or nothing could be stepped (a stretch with no repeat)
        entry["failed"].append("no-step-found" if entry["steps"] else "no-repeat-found")
        return result
    try:
        new = rp.realign_cuts(ctx.em, rt, sorted(set(cuts)), ctx.blank, seq=base)
    except (RuntimeError, ValueError):
        entry["failed"].append("align")
        return result
    cand = _splice(words, region, new, ctx.pauses)
    fails, probes, g2 = _evaluate(ctx, region, cand, raw, before, words, repeated)
    if fails:
        entry["failed"] += fails
        entry["tried_start_ms"] = round(ayah_starts(cand).get(focus, 0) * 1000)
        return result
    if confirmed is None:
        return finish(cand, probes, g2, "start")
    return finish(cand, probes, g2, kind, *_outcome(rp, surah, confirmed, rt.word_ayah, mode, new))


def _entry_of(words: list[dict], key: str, position: int, dur_ms: int) -> dict | None:
    n = int(key.split(":")[1])
    cand = [w for w in _spoken(words) if w["ayah"] == n and w["position"] == position]
    return min(cand, key=lambda x: abs((x["end_ms"] - x["start_ms"]) - dur_ms)) if cand else None


def squeezed_following(ctx: RepairContext, words: list[dict], entry: dict) -> list[dict]:
    """Q7e: the words after `entry` (same ayah, recited order) that dense ASR over `entry`'s span hears, in order, at
    ELONG_SCORE: the squeezed-late pattern, where a stretched word holds the audio of the words after it."""
    ayah = sorted((w for w in _spoken(words) if w["ayah"] == entry["ayah"]), key=lambda w: w["start_ms"])
    following = [w for w in ayah if w["start_ms"] > entry["start_ms"]]
    heard = norm(ctx.dense([(entry["start_ms"] / 1000, entry["end_ms"] / 1000)])[0]).split()
    j = 0
    for h in heard:
        if j < len(following) and fuzz.ratio(h, norm(following[j]["word"])) >= PARAMS["ELONG_SCORE"]:
            j += 1
    return following[:j]


def _direct_probes(ctx: RepairContext, words: list[dict], ayahs_wanted, raw: dict) -> dict:
    """Q7e: G3 probes at the actual starts of `ayahs_wanted` that have none in `raw` (a start the cut-avoid rule moved
    off), with the same rule and no cut to avoid. Returns the new raw records, marked `direct`."""
    last = max(w["ayah"] for w in _spoken(words))
    need = {a for a in ayahs_wanted if 2 <= a <= last and a not in raw}
    if not need:
        return {}
    r = probe_ayah_starts(ctx.wav, words, ctx.surah, ctx.ayahs, ctx.transcribe_clips, (), only=need,
                          batch=ctx.batch, post=ctx.g3_post)
    return {a: {**rec, "direct": True} for a, rec in r["probes"].items() if a in need}


def repair_onset(ctx: RepairContext, words: list[dict], key: str, position: int, dur_ms: int, raw: dict,
                 g2_old: dict | None) -> dict | None:
    """Q7e word-onset repair of a stretched word whose span ASR hears the words after it (squeezed late).

    The squeezed group is the following words the span's ASR hears in order, plus the words right after them that are
    aligned at less than half their expected length. The stretched word keeps its start; the first following word
    must come out more than G5_TOL_MS earlier than it was aligned, or the pattern is refused as `not-squeezed`. The onset of the first following word is searched with the end repair's stepped search (coarse grid, then the
    half-step grid, the long clip, STEP_SCORE), backwards from its aligned start but not before the stretched word.
    The stretched word and the squeezed words are then aligned again between the fixed points (`realign_cuts`): the
    stretched word from its own start to that onset, the following words from there to the next word that was not
    squeezed. Accepted only if ayah n then holds no new stretched word and the target is no longer stretched, the G3
    starts of ayahs n - 1, n and n + 1 are OK (probed directly, without cut-avoid), G5 holds on n - 1 .. n + 1, and
    G2 still passes when n is the last ayah. Repeated positions of ayah n below FLOOR make n segments_null.

    Returns None when the pattern does not hold, else {"entry", "words" (or None), "probes", "g2", "null"}.
    """
    from . import repeats as rp

    entry = _entry_of(words, key, position, dur_ms)
    if entry is None:
        return None
    group = squeezed_following(ctx, words, entry)
    if not group:
        return None
    n = entry["ayah"]
    spoken = sorted(_spoken(words), key=lambda w: (w["ayah"], w["start_ms"]))
    ayah = [w for w in spoken if w["ayah"] == n]
    # the squeezed block may run past what the span's ASR heard: the following words aligned at less than half
    # their expected length (letters x pace) join the group
    opening = _opening(words)
    rest = [w for w in ayah if w["start_ms"] > group[-1]["start_ms"]]
    for w in rest:
        if (w["end_ms"] - w["start_ms"]) / 1000 >= 0.5 * _letters(w, opening) * ctx.pace:
            break
        group.append(w)
    i = next(k for k, w in enumerate(ayah) if w is entry)
    # the local text of a long clip: up to three words before the stretched word, the rest of the ayah, and the first
    # G3_NEXT_WORDS of the next one, so a clip never holds more words than the text it is matched against
    nxt_ayah = norm(ctx.ayahs.get((ctx.surah, n + 1), "")).split()[:PARAMS["G3_NEXT_WORDS"]]
    ctxw = [norm(w["word"]) for w in ayah[max(0, i - 3):]] + nxt_ayah
    j = min(i, 3) + 1  # index of the first following word in ctxw
    target = group[0]
    pre = PARAMS["G4_PRE_S"]
    timing = {"seconds": 0.0, "clips": 0}

    def judge(ts):
        texts = _run(ctx.wav, [(t - pre, t + _last_word_post(ctx.g3_post)) for t in ts], ctx.transcribe_clips,
                     ctx.batch, timing)
        out = []
        for t, text in zip(ts, texts):
            r = _onset_verdict(text, ctxw, j)
            out.append((t, r["verdict"] == OK, r["score"]))
        return out

    t1 = target["start_ms"] / 1000
    floor_s = entry["start_ms"] / 1000 + 0.1
    offsets = [d for d in _steps(-1) if t1 + d > floor_s]
    rec = {"region": [f"{ctx.surah}:{n}", f"{ctx.surah}:{n}"], "trigger": ["stretch"], "kind": "onset",
           "word": f"{n}:{position}", "following": len(group), "ctc_margin": None, "jumps": [], "accepted": False,
           "failed": [], "before_start_ms": target["start_ms"]}
    result = {"entry": rec, "words": None, "probes": {}, "g2": None, "null": []}
    found = _stepped(t1, offsets, pre, judge, ctx.batch) if offsets else None
    rec["steps"] = timing["clips"]
    if found is None:
        rec["failed"].append("no-step-found")
        return result

    after_group = [w for w in spoken if w["start_ms"] > group[-1]["start_ms"]]
    nxt = after_group[0]["start_ms"] if after_group else round(ctx.duration_s * 1000)
    f0 = max(0, _frame(entry["start_ms"], ctx.spf) - PARAMS["CUT_BACK_FRAMES"])
    f1 = min(int(ctx.em.shape[0]), _frame(nxt, ctx.spf))  # up to the next word's start, which stays where it is
    rt = rp.region_text(ctx.surah, ctx.ayahs, n, n, ctx.vocab, f0=f0, f1=f1, spf=ctx.spf)
    index = {p: k for k, (_, p, _, _) in enumerate(rt.sw)}
    olds = [entry] + group
    if any(w["position"] not in index for w in olds):
        rec["failed"].append("tokens")
        return result
    try:
        new = rp.realign_cuts(ctx.em, rt, [(1, round(found[0] - pre, 3))], ctx.blank,
                              seq=[index[w["position"]] for w in olds])
    except (RuntimeError, ValueError):
        rec["failed"].append("align")
        return result
    new.sort(key=lambda w: w["start_ms"])
    if len(new) != len(olds):
        rec["failed"].append("align")
        return result
    for o, w in zip(olds, new):
        if "occurrence" in o:
            w["occurrence"] = o["occurrence"]
    new[0]["start_ms"] = entry["start_ms"]  # the stretched word's own start is a fixed point: only its end moves
    if new[1]["start_ms"] >= target["start_ms"] - PARAMS["G5_TOL_MS"]:
        # the following word was not late: the stretch is not the squeezed pattern (Whisper can continue the text
        # over a long word), so nothing is re-aligned
        rec["failed"].append("not-squeezed")
        rec["after_start_ms"] = new[1]["start_ms"]
        rec["steps"] = timing["clips"]
        return result
    gone = {id(w) for w in olds}
    cand = [dict(w) for w in words if id(w) not in gone] + new
    cand.sort(key=lambda w: (w["ayah"], w["start_ms"]))
    if ctx.pauses:
        from .snap import SNAP_WINDOW_MS, snap_to_pauses
        snap_to_pauses([w for w in cand if n - 1 <= w["ayah"] <= n + 1], ctx.pauses, window_ms=SNAP_WINDOW_MS)
        cand.sort(key=lambda w: (w["ayah"], w["start_ms"]))

    # evaluate
    fails = []
    if not _structure_ok(cand, n, n):
        fails.append("structure")
    before_stretch = {(k, p) for k, p, _ in stretched_words(words, ctx.pace)}
    for k, p, _ in stretched_words(cand, ctx.pace):
        if int(k.split(":")[1]) == n and ((k, p) not in before_stretch or p == position):
            fails.append(f"stretch {k}:{p}")
    probes = {}
    if not fails:
        last = max(w["ayah"] for w in _spoken(cand))
        want = {a for a in (n - 1, n, n + 1) if 2 <= a <= last}
        r = probe_ayah_starts(ctx.wav, cand, ctx.surah, ctx.ayahs, ctx.transcribe_clips, (), only=want,
                              batch=ctx.batch, post=ctx.g3_post)
        probes = {a: {**p, "direct": True} for a, p in r["probes"].items()}
        resolved = refrain_resolve({**raw, **probes}, ctx.usable)
        fails += [f"G3 {ctx.surah}:{a}" for a in sorted(want) if a not in resolved or resolved[a]["verdict"] != OK]
        g5 = _region_g5(ctx.anchors, cand, n - 1, n + 1)
        if g5["status"] == "fail" or g5["outlier_ayahs"]:
            fails.append("G5")
        if n == last:
            g2 = end_coverage(ctx.wav, cand, ctx.surah, ctx.ayahs, ctx.transcribe_clips, resolved, ctx.completeness,
                              ctx.duration_s, batch=ctx.batch, post=ctx.g3_post)
            result["g2"] = g2
            if g2["status"] != "pass" and (g2_old or {}).get("status") == "pass":
                fails.append("G2")
    rec["steps"] = timing["clips"]
    new_target = next((w for w in cand if w["ayah"] == n and w["position"] == target["position"]
                       and w.get("occurrence") == target.get("occurrence")), None)
    rec["after_start_ms"] = None if new_target is None else new_target["start_ms"]
    if fails:
        rec["failed"] += fails
        return result
    count: dict[int, int] = {}
    for w in cand:
        if w["ayah"] == n:
            count[w["position"]] = count.get(w["position"], 0) + 1
    low = any(w["ayah"] == n and count[w["position"]] > 1 and w["confidence"] < PARAMS["FLOOR"] for w in cand)
    rec.update(accepted=True, null=[n] if low else [], cross=[])
    result.update(words=cand, probes=probes, null=rec["null"])
    return result


def _onset_pass(ctx: RepairContext, out: dict, g2_ref, tried: set) -> None:
    """Q7e: word-onset repairs on the stretched words left, until none is accepted. Each (word, duration) is tried
    once; an accepted repair can expose the next squeezed word, which is then tried in turn."""
    while True:
        accepted = False
        for k, p, dur in stretched_words(out["words"], ctx.pace):
            if (k, p, dur) in tried:
                continue
            tried.add((k, p, dur))
            r = repair_onset(ctx, out["words"], k, p, dur, out["raw"], out["g2"] or g2_ref)
            if r is None:
                continue
            out["repairs"].append(r["entry"])
            if r["words"] is not None:
                out["words"] = r["words"]
                out["raw"].update(r["probes"])
                out["null"] += r["null"]
                if r["g2"] is not None:
                    out["g2"] = r["g2"]
                accepted = True
                break
        if not accepted:
            return


def run_repairs(ctx: RepairContext, words: list[dict], raw: dict, first: dict, detect=None) -> dict:
    """Detect the regions of a surah whose first-pass record needs repair and repair them in order.

    Returns {"words", "raw" (G3 probes before refrain resolution, re-probed where a repair was accepted), "g2" (the
    latest accepted G2 or None), "repairs" (records), "null", "cross", "elongations" ([key, position, ms, score] of
    the stretched words left that `verify_elongation` accepts)}.
    """
    from . import repeats as rp

    out = {"words": words, "raw": dict(raw), "g2": None, "repairs": [], "null": [], "cross": []}
    g2 = first["checks"].get("G2") if isinstance(first["checks"].get("G2"), dict) else None
    duration_ms = round(ctx.duration_s * 1000)
    # Q7e: every ayah start the cut-avoid rule moved off gets its own direct probe, so no check rests on a start
    # without evidence; a direct probe that fails is a G3 failure like any other
    moved = [int(a) for a in (first["checks"].get("G3", {}) or {}).get("moved", {})]
    out["raw"].update(_direct_probes(ctx, words, moved, out["raw"]))
    # Q7e: word-onset repairs first, so a region is not failed by a squeezed word that has a repair of its own
    tried: set = set()
    _onset_pass(ctx, out, g2, tried)
    if out["g2"] is not None:
        g2 = out["g2"]
    first_now = {**first, "checks": {**first["checks"], "G3": {
        **first["checks"].get("G3", {}),
        "failed": sorted(a for a, r in refrain_resolve(out["raw"], ctx.usable).items() if r["verdict"] != OK)}}}
    regions = (detect or rp.detect)(out["words"], ctx.anchors, first_now, ctx.pace, duration_ms=duration_ms)
    out["regions"] = regions

    def attempt(region):
        nonlocal g2
        r = repair_region(ctx, region, out["words"], out["raw"], g2)
        if r["entry"] is not None:
            out["repairs"].append(r["entry"])
        if r["words"] is not None:
            out["words"] = r["words"]
            out["raw"].update(r["probes"])
            out["null"] += r["null"]
            out["cross"] += r["cross"]
            if r["g2"] is not None:
                out["g2"] = g2 = r["g2"]
        return r

    def still_failing(sub) -> bool:
        """The sub-region's focus still fails on the words and probes accepted so far."""
        n = sub.focus[0]
        why = set(sub.triggers)
        resolved = refrain_resolve(out["raw"], ctx.usable)
        if "G3" in why and n in resolved and resolved[n]["verdict"] != OK:
            return True
        if "stretch" in why and any(int(k.split(":")[1]) == n for k, _, _ in stretched_words(out["words"], ctx.pace)):
            return True
        if "G2" in why and (g2 is None or g2.get("status") != "pass"):
            return True
        return "G5" in why

    for region in regions:
        r = attempt(region)
        if r["words"] is None and len(region.focus) > 1:
            # the merged region failed as a whole: repair it ayah by ayah, each on the words accepted so far, and
            # only where the ayah still fails (an earlier sub-region may have fixed it)
            for sub in rp.split(region, out["words"], duration_ms):
                if sub.failing and still_failing(sub):
                    attempt(sub)
    _onset_pass(ctx, out, g2, tried)  # Q7e: the stretched words left, also in ayahs that hold accepted repeats
    out["null"] = sorted(set(out["null"]))

    # verified elongations (Q7d): the stretched words left, in ayahs where no back-jump was ever confirmed by CTC
    resolved = refrain_resolve(out["raw"], ctx.usable)
    jumped = {int(k.split(":")[0]) for e in out["repairs"] for j in e.get("jumps", [])
              if len(j) > 3 and j[3] for k in j[:2]}
    out["elongations"] = []
    for k, pos, dur in stretched_words(out["words"], ctx.pace):
        if int(k.split(":")[1]) in jumped:
            continue
        found = verify_elongation(ctx, out["words"], k, pos, dur, resolved, out["g2"] or g2)
        if found is not None:
            out["elongations"].append([found["key"], found["position"], found["dur_ms"], found["score"]])
    return out

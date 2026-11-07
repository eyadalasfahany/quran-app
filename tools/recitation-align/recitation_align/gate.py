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
from typing import NamedTuple

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
    return {"verdict": OK if good else BAD, "heard": heard, "score": score}


def ayah_starts(words: list[dict]) -> dict[int, float]:
    """Start of each ayah in seconds: its earliest non-basmala word."""
    ms: dict[int, int] = {}
    for w in words:
        if not w.get("basmala"):
            ms[w["ayah"]] = min(ms.get(w["ayah"], w["start_ms"]), w["start_ms"])
    return {a: v / 1000 for a, v in ms.items()}


def _clip(t: float, pre: float) -> tuple[float, float]:
    return max(0.0, t - pre), t + PARAMS["G3_POST_S"]


def _run(wav, clips, transcribe_clips, batch, timing):
    t0 = time.perf_counter()
    out = transcribe_clips(wav, clips, batch=batch)["clips"]
    timing["seconds"] += time.perf_counter() - t0
    timing["clips"] += len(clips)
    return [c["text"] for c in out]


def probe_ayah_starts(wav, words: list[dict], surah: int, ayahs: dict, transcribe_clips, cuts=(), *,
                      only=None, batch: int = 1) -> dict:
    """G3: probe the start of every ayah 2..N (or of `only`).

    `words` is the aligned document's words, `ayahs` the Tanzil dict {(surah, ayah): text}, `cuts` the anchor
    cut times in seconds. A start within G3_CUT_AVOID_S of a cut is not probed; the next start that is not
    near a cut is probed instead (`moved`). A BAD or UNSURE probe is repeated at the pre-rolls in G3_REPROBE
    and the worse of those results counts.

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
    locals_ = {n: local_text(surah, n, ayahs) for n in targets}
    texts = _run(wav, [_clip(starts[n], pre) for n in targets], transcribe_clips, batch, timing) if targets else []
    probes: dict[int, dict] = {}
    for n, text in zip(targets, texts):
        r = match_start(text, locals_[n])
        probes[n] = {**r, "start_s": starts[n], "pre_s": pre, "initial": r["verdict"], "reprobed": False,
                     "text": norm(text)}
    redo = [n for n in targets if probes[n]["verdict"] != OK]
    if redo:
        pres = PARAMS["G3_REPROBE"]
        clips = [_clip(starts[n], p) for n in redo for p in pres]
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
    read from `words` when the word is there (a repair may have moved it). `regions` is a list of inclusive ayah
    ranges (found by stretch or by G3) that are set aside. n/a below G5_MIN_N words. `outlier_ayahs` are the
    held-out ayah checkpoints (`anchors["held_out"]`) more than OUTLIER_MS from the final ayah start.
    """
    final = {(w["ayah"], w["position"]): w["start_ms"] for w in words}
    diffs, set_aside = [], 0
    for ayah, pos, cp_ms, fin_ms in anchors.get("held_out_refs", []):
        if _in_regions(ayah, regions):
            set_aside += 1
            continue
        diffs.append(abs(final.get((ayah, pos), fin_ms) - cp_ms))
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


def end_coverage(wav, words: list[dict], surah: int, ayahs: dict, transcribe_clips, g3_probes: dict, completeness: dict,
                 duration_s: float, *, batch: int = 1) -> dict:
    """G2: the last ayah start and the last word start are probed OK, and the tail after the last word is at most
    TAIL_MAX_S or no longer than completeness's measured `trailing_s` (+ TAIL_TOL_S).

    The last ayah reuses its G3 probe when there is one; otherwise it is probed here with no cut to avoid.
    """
    spoken = sorted(_spoken(words), key=lambda w: (w["ayah"], w["position"]))
    last_ayah = spoken[-1]["ayah"]
    timing = {"seconds": 0.0, "clips": 0}
    probe = g3_probes.get(last_ayah)
    if probe is None:
        r = probe_ayah_starts(wav, words, surah, ayahs, transcribe_clips, (), only={last_ayah}, batch=batch)
        probe = r["probes"].get(last_ayah)
        timing["seconds"] += r["seconds"]
        timing["clips"] += r["clips"]
    last = spoken[-1]
    t = last["start_ms"] / 1000
    texts = _run(wav, [(max(0.0, t - PARAMS["G4_PRE_S"]), t + PARAMS["G4_POST_S"])], transcribe_clips, batch, timing)
    ctx = [norm(w["word"]) for w in spoken[-4:]]
    word = _last_word_verdict(texts[0], ctx)
    tail_s = round(duration_s - max(w["end_ms"] for w in spoken) / 1000, 1)
    trailing = completeness.get("trailing_s") or 0.0
    tail_ok = tail_s <= PARAMS["TAIL_MAX_S"] or tail_s <= trailing + TAIL_TOL_S
    ayah_verdict = probe["verdict"] if probe else UNSURE
    ok = ayah_verdict == OK and word["verdict"] == OK and tail_ok
    return {"last_ayah": ayah_verdict, "last_word": word["verdict"], "last_word_score": word["score"],
            "tail_s": tail_s, "tail_ok": tail_ok, "status": "pass" if ok else "fail",
            "clips": timing["clips"], "seconds": round(timing["seconds"], 3)}


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
            "verdict": verdict, "reasons": reasons, "checks": checks, "repairs": [],
            "segments_null": extra.pop("segments_null", []), "cross_ayah": [],
            "probes": extra.pop("probes", []), "seconds": extra.pop("seconds", {})}


def surah_verdict(surah: int, completeness: dict, *, refusal: dict | None = None, words: list[dict] | None = None,
                  anchors: dict | None = None, g2: dict | None = None, g3: dict | None = None,
                  g4: dict | None = None, pauses=None, seconds: dict | None = None) -> dict:
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
    nulls = low_conf_ayahs(words)
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
    triggers = {"G3": g3_failed, "stretch": [k for k, _, _ in stretch],
                "G2": bool(g2 and g2.get("status") == "fail"), "G5": g5["status"] == "fail",
                "G5_outliers": g5["outlier_ayahs"]}
    checks["triggers"] = triggers
    extra = {"probes": probes, "seconds": seconds, "segments_null": nulls}
    if gap["unavailable"]:
        return _record(surah, completeness, "unavailable", ["incomplete-middle"], checks, **{**extra, "segments_null": []})
    if g3_failed or stretch or triggers["G2"] or triggers["G5"] or g5["outlier_ayahs"]:
        return _record(surah, completeness, "no_highlight", ["needs-repair"], checks, **{**extra, "segments_null": []})
    if len(nulls) > PARAMS["NULL_SHARE"] * ayah_count:
        return _record(surah, completeness, "no_highlight", ["segments-null-share"], checks,
                       **{**extra, "segments_null": []})
    return _record(surah, completeness, "pass", [], checks, **extra)

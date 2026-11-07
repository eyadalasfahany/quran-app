"""Gate probes (ADR 0077 decision 5, plan way2quran-quality Q5): G3 ayah-start probes and the G4 word-onset screen.

Short clips are cut at the aligner's final starts, transcribed by the pinned Whisper and matched against a
local text only, so a refrain elsewhere in the surah cannot match. The transcription is injected
(`transcribe_clips`), so the rules here are testable without a model. Quran text comes from the caller
(Tanzil, read at runtime); matching keys are normalised, the text itself is never changed.
"""

import hashlib
import random
import time
from typing import NamedTuple

from rapidfuzz import fuzz

from .quality import PARAMS
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


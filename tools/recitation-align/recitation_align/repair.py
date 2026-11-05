"""Anomaly-triggered local repair after pass 1.

Detection (no ASR): an ayah's duration per alignment token, divided by the surah's median pace, must
lie in [0.45, 2.2], and its mean word confidence must be at least 0.4. Consecutive anomalous ayahs
(one good ayah in between is allowed) form a stretch, extended by one ayah on each side.

Repair: the stretch's audio (+5 s each side) is transcribed (ASR), its ayah starts are anchored from the
transcript, and the stretch is re-aligned in sub-segments cut at those starts (nearest pause within 3 s).
The repair is kept only when the stretch has fewer anomalous ayahs and a higher mean confidence.
Everything outside a stretch is left as pass 1 wrote it.
"""

import statistics
from collections import defaultdict

from .models import SAMPLE_RATE
from .text import norm


def frame_at(seconds: float, sec_per_frame: float) -> int:
    """Emission frame at `seconds`, with the measured frame length (audio length / frames), as align_full uses it."""
    return round(seconds / sec_per_frame)


def seconds_of_frame(frame: int, sec_per_frame: float) -> float:
    return frame * sec_per_frame


def ms_of_frame(frame: float, sec_per_frame: float) -> int:
    return round(frame * sec_per_frame * 1000)

RATIO_HIGH = 2.2
RATIO_LOW = 0.45
CONF_LOW = 0.4
GAP_ALLOW = 1  # good ayahs allowed inside a stretch
MARGIN_S = 5.0  # audio margin on each side of a stretch for the ASR
CUT_PAUSE_S = 3.0  # a pause this close to an anchored start is used as the cut


def ayah_stats(words: list[dict]) -> dict[int, dict]:
    """Per ayah (basmala excluded): start/end ms, alignment tokens (letters), mean confidence, word count."""
    grouped = defaultdict(list)
    for w in words:
        if not w.get("basmala"):
            grouped[w["ayah"]].append(w)
    out = {}
    for a, ws in grouped.items():
        tokens = sum(len(norm(w["word"]).replace(" ", "")) for w in ws)
        out[a] = {
            "start_ms": min(w["start_ms"] for w in ws),
            "end_ms": max(w["end_ms"] for w in ws),
            "tokens": tokens,
            "conf": statistics.fmean(w["confidence"] for w in ws),
            "words": len(ws),
        }
    return out


def pace(stats: dict[int, dict]) -> float:
    """Median ms per alignment token over the surah's ayahs."""
    per = [(s["end_ms"] - s["start_ms"]) / s["tokens"] for s in stats.values() if s["tokens"] > 0]
    return statistics.median(per) if per else 0.0


def ayah_is_anomalous(s: dict, p: float) -> bool:
    if s["tokens"] <= 0 or p <= 0:
        return False
    ratio = (s["end_ms"] - s["start_ms"]) / (s["tokens"] * p)
    return ratio > RATIO_HIGH or ratio < RATIO_LOW or s["conf"] < CONF_LOW


def anomalous_ayahs(stats: dict[int, dict], p: float) -> list[int]:
    return sorted(a for a, s in stats.items() if ayah_is_anomalous(s, p))


def group_stretches(anomalous: list[int], ayahs: list[int], gap_allow: int = GAP_ALLOW) -> list[tuple[int, int]]:
    """Stretches of anomalous ayahs (`ayahs` is the surah's ayah list in order), each extended by one
    ayah on each side and merged where they overlap. Returns (first ayah, last ayah) pairs."""
    index = {a: i for i, a in enumerate(ayahs)}
    idx = sorted(index[a] for a in anomalous if a in index)
    if not idx:
        return []
    groups = [[idx[0], idx[0]]]
    for i in idx[1:]:
        if i - groups[-1][1] <= gap_allow + 1:
            groups[-1][1] = i
        else:
            groups.append([i, i])
    spans = []
    for lo, hi in groups:
        lo = max(0, lo - 1)
        hi = min(len(ayahs) - 1, hi + 1)
        if spans and lo <= spans[-1][1] + 1:
            spans[-1] = (spans[-1][0], max(spans[-1][1], hi))
        else:
            spans.append((lo, hi))
    return [(ayahs[lo], ayahs[hi]) for lo, hi in spans]


def anomaly_count(words: list[dict], p: float, ayahs: set[int] | None = None) -> int:
    stats = ayah_stats(words)
    return sum(1 for a in anomalous_ayahs(stats, p) if ayahs is None or a in ayahs)


def mean_confidence(words: list[dict]) -> float:
    ws = [w for w in words if not w.get("basmala")]
    return statistics.fmean(w["confidence"] for w in ws) if ws else 0.0


def accept_repair(before: list[dict], after: list[dict], p: float, ayahs: set[int]) -> tuple[bool, dict]:
    """Keep the repair only when the stretch has fewer anomalous ayahs and a higher mean confidence."""
    b_count = anomaly_count(before, p, ayahs)
    a_count = anomaly_count(after, p, ayahs)
    b_conf = mean_confidence(before)
    a_conf = mean_confidence(after)
    ok = a_count < b_count and a_conf > b_conf
    return ok, {"anomalies_before": b_count, "anomalies_after": a_count,
                "mean_conf_before": round(b_conf, 4), "mean_conf_after": round(a_conf, 4)}


def replace_span(words: list[dict], lo: int, hi: int, new: list[dict]) -> list[dict]:
    """words with the entries for ayahs lo..hi replaced by `new`. Other entries are the same objects."""
    before = [w for w in words if w["ayah"] < lo]
    after = [w for w in words if w["ayah"] > hi]
    return before + new + after


def repair_surah(
    words: list[dict],
    *,
    surah: int,
    ayahs: dict,
    em,
    wav,
    audio_sha: str,
    pauses: list,
    basmala_recited,
    cache_dir,
    settings: dict,
    log=None,
) -> tuple[list[dict], list[dict], float]:
    """Detect stretches in pass 1 and repair the ones the ASR supports. Returns (words, repairs, ASR seconds)."""
    import time
    from pathlib import Path

    import torch

    from .align import MUQATTAAT, align_emissions, align_segmented, load_vocab, surah_tokens
    from .anchors import ayah_anchors
    from .snap import snap_to_pauses
    from .transcribe import cached_transcribe

    say = log or (lambda msg: None)
    stats = ayah_stats(words)
    p = pace(stats)
    anomalous = set(anomalous_ayahs(stats, p))
    first = [w for w in words if w["ayah"] == 1 and not w.get("basmala")]
    if basmala_recited is False and first and min(first, key=lambda w: w["position"])["confidence"] < 0.5:
        anomalous.add(1)  # ayah 1 with the basmala omitted: its first word is suspect
    ayah_list = sorted(stats)
    spans = group_stretches(sorted(anomalous), ayah_list)
    say(f"anomalous ayahs {sorted(anomalous)}; stretches {spans}")
    repairs: list[dict] = []
    asr_seconds = 0.0
    if not spans:
        return words, repairs, asr_seconds
    vocab, blank = load_vocab()
    total = em.shape[0]
    sec_per_frame = len(wav) / SAMPLE_RATE / total  # measured, not a fixed 50 frames per second
    cache_dir = Path(cache_dir)
    for lo, hi in spans:
        span_ayahs = {a for a in ayah_list if lo <= a <= hi}
        before = [w for w in words if lo <= w["ayah"] <= hi]
        rec = {"span": [lo, hi], "ayahs": sorted(span_ayahs)}
        f0 = max(0, frame_at(stats[lo]["start_ms"] / 1000 - MARGIN_S, sec_per_frame))
        f1 = min(total, frame_at(stats[hi]["end_ms"] / 1000 + MARGIN_S, sec_per_frame))
        t0 = time.time()
        s0 = min(len(wav), round(f0 * sec_per_frame * SAMPLE_RATE))
        s1 = min(len(wav), round(f1 * sec_per_frame * SAMPLE_RATE))
        asr = cached_transcribe(wav[s0:s1], f"{audio_sha}@{f0}-{f1}",
                                cache_dir / f"{audio_sha[:16]}-{f0}-{f1}.json")
        asr_seconds += time.time() - t0
        chunks = [{"start_s": c["start_s"] + seconds_of_frame(f0, sec_per_frame), "text": c["text"]}
                  for c in asr["chunks"]]
        sub_ayahs = {k: v for k, v in ayahs.items() if k[0] == surah and lo <= k[1] <= hi}
        anchors = ayah_anchors(chunks, surah, sub_ayahs)
        mids = [(s + e) / 2 for s, e in pauses if e != float("inf")]
        cuts: list[tuple[int, int]] = []
        for a in sorted(anchors):
            if a == lo:
                continue
            t = anchors[a]
            near = [m for m in mids if abs(m - t) <= CUT_PAUSE_S]
            if near:
                t = min(near, key=lambda m: abs(m - t))
            frame = frame_at(t, sec_per_frame) - f0
            if frame <= 0 or frame >= f1 - f0 or (cuts and frame <= cuts[-1][1]):
                continue
            cuts.append((a, frame))
        sw, tokens, wot, aow = surah_tokens(surah, ayahs, lo, hi, basmala_recited, vocab)
        seg = em[f0:f1]
        try:
            with torch.inference_mode():
                if cuts:
                    agg = align_segmented(seg, tokens, wot, aow, blank, cuts, leading_star=False, **settings)
                else:
                    agg = align_emissions(seg, tokens, wot, aow, blank, leading_star=False, **settings)
        except RuntimeError as exc:
            rec.update(status="rejected", reason=f"alignment failed: {str(exc)[:120]}")
            repairs.append(rec)
            continue
        orig = {(w["ayah"], w["position"]): w for w in before}
        new = []
        for wi in sorted(agg):
            a, pos, text, _ = sw[wi]
            r = agg[wi]
            entry = {"surah": surah, "ayah": a, "position": pos, "word": text,
                     "start_ms": ms_of_frame(r["start"] + f0, sec_per_frame),
                     "end_ms": ms_of_frame(r["end"] + 1 + f0, sec_per_frame),
                     "confidence": round(sum(r["score"]) / len(r["score"]), 3)}
            if (a, pos) in orig and "basmala" in orig[(a, pos)]:
                entry["basmala"] = orig[(a, pos)]["basmala"]
            new.append(entry)
        if len(new) != len(before):
            rec.update(status="rejected", reason="word count changed")
            repairs.append(rec)
            continue
        snap_to_pauses(new, pauses)
        ok, metrics = accept_repair(before, new, p, span_ayahs)
        rec.update(metrics, status="accepted" if ok else "rejected", cuts=len(cuts), anchors=len(anchors))
        if not ok:
            rec["reason"] = "not better"
        else:
            words = replace_span(words, lo, hi, new)
        repairs.append(rec)
        say(f"stretch {lo}-{hi}: {rec['status']} {metrics}")
    return words, repairs, asr_seconds

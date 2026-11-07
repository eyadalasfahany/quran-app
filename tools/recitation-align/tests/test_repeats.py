"""Repeat detection, the recited sequence, the CTC confirm and the re-align (plan way2quran-quality Q7a and Q7b).

Placeholder tokens only (`w1` ... `w20`, spelled `wa` ... `wt`, or PLACEHOLDER letter strings where `text.norm` must keep them): no Quran
text, no model, no network. Emissions are constructed log-probs.
"""

import random
import time

import torch

from recitation_align import repeats as rp
from recitation_align.quality import PARAMS
from recitation_align.repeats import (Region, RegionText, back_jumps, classify, confirm_ctc, dense_windows, detect,
                                      realign_region, recited_sequence, stitch_windows)

# PLACEHOLDER tokens w1 ... w20, spelled wa ... wt so that no token is a prefix of another ("w1" and "w15" would
# score as half-similar words, which real ASR words of different text are not)
W = [f"w{chr(97 + i)}" for i in range(20)]
PENALTY = PARAMS["BACK_PENALTY"]


def seq_of(asr, region=W):
    return recited_sequence(asr, region, PENALTY)


# --- the recited sequence (Q7a) -----------------------------------------------------------------------------------

def test_a_doubled_span_gives_the_span_twice():
    seq = seq_of(W[:9] + W[:9] + W[9:])
    assert seq == list(range(9)) + list(range(9)) + list(range(9, 20))


def test_a_triple_repeat_gives_two_back_jumps():
    seq = seq_of(W[:9] + W[4:9] + W[4:9] + W[9:])
    assert seq == list(range(9)) + list(range(4, 9)) * 2 + list(range(9, 20))
    assert back_jumps(seq) == [(8, 4), (8, 4)]


def test_insertion_noise_and_dropped_words_do_not_jump():
    noisy = W[:5] + ["xq"] + W[5:12] + W[13:]  # one invented word, one dropped word
    assert seq_of(noisy) == list(range(20))
    assert seq_of(W[:3] + W[6:]) == list(range(20))  # a run of dropped words is still recited, in order


def test_a_clean_sequence_has_no_back_jump():
    assert seq_of(W) == list(range(20))
    assert back_jumps(seq_of(W)) == []


def test_a_refrain_like_duplicate_in_the_region_is_not_a_jump():
    region = W[:4] + W[:4] + W[4:10]  # the same four tokens twice in the text itself
    assert seq_of(region, region) == list(range(len(region)))


def test_a_short_duplicate_below_the_penalty_is_noise():
    # two words heard twice cost less as insertions than a back-jump
    assert back_jumps(seq_of(W[:8] + W[6:8] + W[8:])) == []


def test_every_region_word_is_recited_at_least_once():
    seq = seq_of(W[2:10] + W[2:10] + W[10:18])
    assert set(seq) == set(range(20))


def test_the_program_is_fast_on_a_four_hundred_word_region():
    rng = random.Random(4)
    letters = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي"  # PLACEHOLDER letters
    region = ["".join(rng.choice(letters) for _ in range(5)) for _ in range(400)]
    asr = region[:200] + region[150:200] + region[200:]
    t0 = time.perf_counter()
    seq = recited_sequence(asr, region, PENALTY)
    assert time.perf_counter() - t0 < 2.0
    assert back_jumps(seq) == [(199, 150)]


# --- stitching overlapping windows ----------------------------------------------------------------------------------

def test_overlapping_windows_stitch_without_a_seam_jump():
    texts = [W[0:7], W[4:11], W[8:15], W[12:20]]  # each window repeats the end of the one before
    stitched = stitch_windows(texts)
    assert stitched == W
    assert back_jumps(seq_of(stitched)) == []


def test_a_real_repeat_inside_a_window_survives_stitching():
    texts = [W[0:6], W[3:9] + W[3:6], W[3:6] + W[6:12], W[9:20]]
    seq = seq_of(stitch_windows(texts))
    assert back_jumps(seq) == [(8, 3)]


def test_dense_windows_cover_the_region_at_the_hop():
    r = Region(4, 6, start_ms=100_000, end_ms=127_000)
    wins = dense_windows(r)
    assert wins[0] == (100.0, 110.0) and wins[1] == (105.0, 115.0)
    assert wins[-1][1] == 127.0 and all(b - a <= PARAMS["DENSE_WIN_S"] for a, b in wins)
    assert dense_windows(Region(1, 2, start_ms=0, end_ms=6000)) == [(0.0, 6.0)]


# --- classify ------------------------------------------------------------------------------------------------------

def test_classify_within_cross_and_none():
    ayah = [1] * 5 + [2] * 5
    assert classify(list(range(10)), ayah) == "none"
    assert classify([0, 1, 2, 3, 4, 2, 3, 4, 5, 6, 7, 8, 9], ayah) == "within-ayah"
    assert classify([0, 1, 2, 3, 4, 5, 6, 3, 4, 5, 6, 7, 8, 9], ayah) == "cross-ayah"


# --- detect -------------------------------------------------------------------------------------------------------

def words_for(n_ayahs=12, per=5, surah=7, long=()):
    """Ayah a holds `per` PLACEHOLDER words 600 ms apart; (ayah, position) in `long` lasts 9 s."""
    out, t = [], 0
    for a in range(1, n_ayahs + 1):
        for p in range(1, per + 1):
            dur = 9000 if (a, p) in long else 400
            out.append({"surah": surah, "ayah": a, "position": p, "word": "بتثج", "start_ms": t,
                        "end_ms": t + dur, "confidence": 0.9})
            t += dur + 200
        t += 500
    return out


def test_each_trigger_fires_on_its_case():
    words = words_for(long={(5, 2)})
    regions = detect(words, {}, None, 0.1)
    assert [(r.lo, r.hi, r.triggers, r.focus) for r in regions] == [(4, 6, ["stretch"], [5])]
    anchors = {"repeat_candidates": [{"from": "7:9", "to": "7:9", "why": ["step-back", "word-surplus"]}]}
    regions = detect(words_for(), anchors, None, 0.1)
    assert [(r.lo, r.hi, r.triggers) for r in regions] == [(8, 10, ["step-back", "word-surplus"])]
    assert not regions[0].failing
    gate = {"checks": {"G3": {"failed": [3]}, "G2": {"status": "fail"}, "G5": {"outlier_ayahs": [8]}}}
    regions = detect(words_for(), {}, gate, 0.1)
    assert [(r.lo, r.hi, r.triggers) for r in regions] == [(2, 4, ["G3"]), (7, 9, ["G5"]), (11, 12, ["G2"])]
    assert all(r.failing for r in regions)


def test_overlapping_regions_merge_and_adjacent_ones_do_not():
    gate = {"checks": {"G3": {"failed": [3, 5, 9]}}}
    regions = detect(words_for(), {}, gate, 0.1)
    assert [(r.lo, r.hi, r.focus) for r in regions] == [(2, 6, [3, 5]), (8, 10, [9])]
    assert regions[0].start_ms == words_for()[5]["start_ms"]  # the first word of ayah 2
    assert regions[0].end_ms == words_for()[30]["start_ms"]  # the first word of ayah 7


def test_a_region_is_clamped_to_the_surah():
    gate = {"checks": {"G3": {"failed": [2, 12]}}}
    regions = detect(words_for(), {}, gate, 0.1, duration_ms=99_000)
    assert [(r.lo, r.hi) for r in regions] == [(1, 3), (11, 12)]
    assert regions[-1].end_ms == 99_000


# --- CTC confirm and re-align (Q7b) -----------------------------------------------------------------------------

BLANK = 0


def emissions(frames_tokens, vocab=6):
    """Log-probs [T, V]: each frame is certain of its token (0.0), every other label at -12."""
    em = torch.full((len(frames_tokens), vocab), -12.0)
    for f, t in enumerate(frames_tokens):
        em[f, t] = 0.0
    return em


def timeline(tokens, per=3, gap=2):
    out = [BLANK] * 4
    for t in tokens:
        out += [t] * per + [BLANK] * gap
    return out + [BLANK] * 4


def test_confirm_ctc_accepts_expanded_favoured_frames_and_rejects_plain_favoured_ones():
    plain, expanded = [1, 2, 3, 4], [1, 2, 3, 2, 3, 4]
    em_rep = emissions(timeline(expanded))
    ok, margin = confirm_ctc(em_rep, plain, expanded, (0, em_rep.shape[0]), BLANK)
    assert ok and margin > PARAMS["CTC_MARGIN"]
    em_plain = emissions(timeline(plain))
    ok, margin = confirm_ctc(em_plain, plain, expanded, (0, em_plain.shape[0]), BLANK)
    assert not ok and margin < PARAMS["CTC_MARGIN"]


def test_confirm_ctc_rejects_at_the_margin(monkeypatch):
    plain, expanded = [1, 2, 3, 4], [1, 2, 3, 2, 3, 4]
    em = emissions(timeline(expanded))
    _, margin = confirm_ctc(em, plain, expanded, (0, em.shape[0]), BLANK)
    monkeypatch.setitem(PARAMS, "CTC_MARGIN", margin + 0.001)
    assert confirm_ctc(em, plain, expanded, (0, em.shape[0]), BLANK)[0] is False


def region_text(n_frames, spf=0.02):
    sw = [(5, 1, "w1", "k1"), (5, 2, "w2", "k2"), (5, 3, "w3", "k3"), (6, 1, "w4", "k4")]  # PLACEHOLDER words
    return RegionText(7, 5, 6, sw, [[1], [2], [3], [4]], 0, n_frames, spf)


def test_realign_region_gives_sorted_occurrences_and_the_ayah_starts_at_the_first():
    seq = [0, 1, 2, 1, 2, 3]  # 5:2-5:3 recited twice
    em = emissions(timeline([1, 2, 3, 2, 3, 4]))
    words = realign_region(em, region_text(em.shape[0]), seq, BLANK)
    assert [(w["ayah"], w["position"], w["occurrence"]) for w in words] == [
        (5, 1, 1), (5, 2, 1), (5, 3, 1), (5, 2, 2), (5, 3, 2), (6, 1, 1)]
    assert words == sorted(words, key=lambda w: (w["ayah"], w["start_ms"]))
    # frame 4 x 20 ms: the first occurrence (the leading star may take the token's first frame: a tie here)
    assert abs(words[0]["start_ms"] - 80) <= 20 and words[1]["start_ms"] < words[3]["start_ms"]
    assert all(w["start_ms"] < w["end_ms"] for w in words)


def test_a_cross_ayah_jump_drops_the_abandoned_opening():
    seq = [0, 1, 2, 3, 2, 3]  # 6:1 begun, then 5:3 again, then 6:1 again
    em = emissions(timeline([1, 2, 3, 4, 3, 4]))
    assert classify(seq, region_text(1).word_ayah) == "cross-ayah"
    words = realign_region(em, region_text(em.shape[0]), seq, BLANK)
    six = [w for w in words if w["ayah"] == 6]
    assert len(six) == 1 and six[0]["occurrence"] == 1  # the abandoned opening is not shipped, so not counted
    assert six[0]["start_ms"] > max(w["start_ms"] for w in words if w["ayah"] == 5)


def test_realign_cuts_takes_the_onset_after_the_probe_point():
    em = emissions(timeline([1, 2, 3, 4]))  # word 6:1 begins at frame 4 + 3 x 5 = 19
    rt = region_text(em.shape[0])
    words = rp.realign_cuts(em, rt, [(3, 19 * 0.02)], BLANK)
    assert [w["ayah"] for w in words] == [5, 5, 5, 6]
    assert abs(words[-1]["start_ms"] - 19 * 20) <= 20  # one frame: the star ties with the token's first frame


def test_region_text_drops_the_basmala_and_spells_nothing_out_of_the_text():
    # PLACEHOLDER letters: ayah (8, 1) opens with the whole of (1, 1), so its first four words count as the basmala
    ayahs = {(1, 1): "ثثث خخ ظظ غغ", (8, 1): "ثثث خخ ظظ غغ بت ثج", (8, 2): "حخ دذ"}
    vocab = {ch: i + 1 for i, ch in enumerate("ثخظغبتجحدذ")}
    rt = rp.region_text(8, ayahs, 1, 2, vocab, f0=0, f1=100, spf=0.02)
    assert [(a, p) for a, p, _, _ in rt.sw] == [(1, 5), (1, 6), (2, 1), (2, 2)]
    assert all(rt.wtok)


def test_the_repeat_mode_parameter_is_one_of_two_values():
    assert PARAMS["REPEAT_MODE"] in ("positions", "null")


def test_each_back_jump_is_confirmed_on_its_own_and_a_rejected_pass_is_dropped():
    # 5:2-5:3 really recited twice; the sequence also claims 5:1 twice, which the audio does not hold
    em = emissions(timeline([1, 2, 3, 2, 3, 4]))
    rt = region_text(em.shape[0])
    seq, details = rp.confirm_jumps(em, rt, [0, 1, 2, 1, 2, 3], BLANK)
    assert seq == [0, 1, 2, 1, 2, 3] and [d["accepted"] for d in details] == [True]
    seq, details = rp.confirm_jumps(em, rt, [0, 0, 1, 2, 1, 2, 3], BLANK)
    assert [(d["from"], d["to"], d["accepted"]) for d in details] == [(0, 0, False), (2, 1, True)]
    assert seq == [0, 1, 2, 1, 2, 3]
    em_plain = emissions(timeline([1, 2, 3, 4]))
    seq, details = rp.confirm_jumps(em_plain, region_text(em_plain.shape[0]), [0, 1, 2, 1, 2, 3], BLANK)
    assert seq == [0, 1, 2, 3] and details[0]["accepted"] is False

"""Q7g (plan way2quran-quality): the emission-driven repeat proposer, the G3 near-tie, G5 setting aside accepted
repeats, and Al-Fatiha's opening key. PLACEHOLDER tokens and letters only; constructed emissions; no model."""

import random

import numpy as np
import pytest

import test_gate_verdicts as V
from test_gate_verdicts import positions  # noqa: F401  (the REPEAT_MODE "positions" fixture)
from recitation_align import completeness as C
from recitation_align import gate
from recitation_align import repeats as rp
from recitation_align.gate import BAD, OK, local_text, match_start
from recitation_align.quality import PARAMS

SURAH = V.SURAH


# --- the proposer (ported from the scratch self-check) -------------------------------------------------------------

def em(frames, V_=8):
    lp = np.full((len(frames), V_), -12.0)
    for f, t in enumerate(frames):
        lp[f, t] = 0.0
    return lp


def tl(tokens, per=3, gap=2):
    out = [0] * 3
    for t in tokens:
        out += [t] * per + [0] * gap
    return out + [0] * 3


WT = [[1], [2], [3], [4]]  # PLACEHOLDER: one token per word


def words_of(occ):
    return [w for w, _, _ in occ]


def test_the_proposer_reads_a_back_jump_a_clean_ayah_and_a_word_said_twice():
    assert words_of(rp.viterbi_repeats(em(tl([1, 2, 3, 2, 3, 4])), WT, 0, 5.0, 8)[0]) == [0, 1, 2, 1, 2, 3]
    assert words_of(rp.viterbi_repeats(em(tl([1, 2, 3, 4])), WT, 0, 5.0, 8)[0]) == [0, 1, 2, 3]
    assert words_of(rp.viterbi_repeats(em(tl([1, 2, 2, 3, 4])), WT, 0, 5.0, 8)[0]) == [0, 1, 1, 2, 3]


def test_a_huge_penalty_or_a_short_reach_forbids_the_jump():
    assert words_of(rp.viterbi_repeats(em(tl([1, 2, 3, 2, 3, 4])), WT, 0, 500.0, 8)[0]) == [0, 1, 2, 3]
    # with max_back 1 only a word recited twice is possible: no jump back over two words
    seq = words_of(rp.viterbi_repeats(em(tl([1, 2, 3, 2, 3, 4])), WT, 0, 5.0, 1)[0])
    assert all(a == b for a, b in rp.back_jumps(seq))


def test_occurrence_frames_follow_the_emissions():
    frames = tl([1, 2, 3, 2, 3, 4])
    occ, score = rp.viterbi_repeats(em(frames), WT, 0, 5.0, 8)
    assert occ[3][1] == 3 + 3 * 5 and score > -50  # the second pass of word 1 starts where token 2 comes back


def test_too_few_frames_give_none():
    assert rp.viterbi_repeats(em([1, 2]), WT, 0, 5.0, 8) == (None, float("-inf"))


def test_back_edges_never_chain_so_max_back_bounds_the_reach():
    frames = tl([1, 2, 3, 4, 1, 2, 3, 4])  # all four words recited again: a jump back over four words
    assert words_of(rp.viterbi_repeats(em(frames), WT, 0, 5.0, 4)[0]) == [0, 1, 2, 3, 0, 1, 2, 3]
    for reach in (1, 2, 3):  # every jump stays within max_back words
        seq = words_of(rp.viterbi_repeats(em(frames), WT, 0, 5.0, reach)[0])
        assert all(a - b + 1 <= reach for a, b in rp.back_jumps(seq)), (reach, seq)


def test_propose_maps_the_sequence_to_the_region_words():
    rt = rp.RegionText(SURAH, 5, 6, [(5, 1, "w", "k1"), (5, 2, "w", "k2"), (5, 3, "w", "k3"), (6, 1, "w", "k4")],
                       WT, 0, 0, 0.02)
    frames = tl([1, 2, 3, 2, 3, 4])
    assert rp.propose(em(frames), rt, (0, len(frames)), 0, 5.0, 8) == [0, 1, 2, 1, 2, 3]
    assert rp.propose(em([1]), rt, (0, 1), 0, 5.0, 8) == [0, 1, 2, 3]  # too few frames: the plain order


def test_the_total_log_prob_confirm_accepts_a_real_pass_and_rejects_an_invented_one():
    real = em(tl([1, 2, 3, 2, 3, 4]))
    ok, margin = rp.confirm_ctc(real, [1, 2, 3, 4], [1, 2, 3, 2, 3, 4], (0, real.shape[0]), 0, score="total")
    assert ok and margin > 0
    plain = em(tl([1, 2, 3, 4]))
    ok, margin = rp.confirm_ctc(plain, [1, 2, 3, 4], [1, 2, 3, 2, 3, 4], (0, plain.shape[0]), 0, score="total")
    assert not ok and margin < 0


# --- the gate path: a repeat proposed from the emissions --------------------------------------------------------

def test_the_5_85_pattern_is_repaired_from_the_emissions_without_dense_asr(positions):
    world, words, true5 = V.repeat_of_tail_world()
    import unittest.mock as um
    with um.patch.object(rp, "recited_sequence", side_effect=AssertionError("no dense-ASR proposal")), \
            um.patch.object(rp, "stitch_windows", side_effect=AssertionError("no dense-ASR proposal")):
        rec, doc = V.gate_world(world, words, n_ayahs=8)
    assert rec["verdict"] == "repaired"
    (rep,) = [r for r in rec["repairs"] if r["accepted"]]
    assert rep["kind"] == "within-ayah" and [j[:2] for j in rep["jumps"]] == [["4:10", "4:7"]]
    assert abs(rep["after_start_ms"] - true5[3]) <= 20


# --- G3 near-tie ---------------------------------------------------------------------------------------------------

LETTERS = "بتثجحخدذرزسشصضطظعغفقكلمنهوي"


def wordlist(seed, k, size=7):
    rng = random.Random(seed)
    return ["".join(rng.choice(LETTERS) for _ in range(size)) for _ in range(k)]


def near_tie_ayahs(shared=6):
    """Ayahs 4 and 5 share their first `shared` PLACEHOLDER words; their next words differ in one letter."""
    same = wordlist(1, shared)
    d = wordlist(2, 1)[0]
    g = d[:-1] + ("ب" if d[-1] != "ب" else "ت")
    ayahs = {(SURAH, a): " ".join(wordlist(10 + a, 8)) for a in range(1, 9)}
    ayahs[(SURAH, 4)] = " ".join(same + [d] + wordlist(3, 3))
    ayahs[(SURAH, 5)] = " ".join(same + [g] + wordlist(4, 3))
    ayahs[(1, 1)] = "صصصص"
    return ayahs, same, d


def test_a_near_tie_between_identical_openings_is_ok_the_2_150_shape():
    ayahs, same, d = near_tie_ayahs()
    heard = " ".join(same + [d])  # the opening of 5 heard, best matched at 4:0 just above 5:0
    r = match_start(heard, local_text(SURAH, 5, ayahs))
    assert r["verdict"] == OK and r.get("tie")  # matched at 5:0 or in the pre-roll word before it


def test_without_the_identical_opening_the_same_gap_stays_bad():
    ayahs, same, d = near_tie_ayahs(shared=6)
    ayahs[(SURAH, 4)] = " ".join(wordlist(7, 2) + same[2:] + [d] + wordlist(3, 3))  # 4 opens differently
    r = match_start(" ".join(same[2:] + [d]), local_text(SURAH, 5, ayahs))
    assert r["verdict"] == BAD


def test_the_near_tie_is_bounded_by_the_delta(monkeypatch):
    ayahs, same, d = near_tie_ayahs()
    monkeypatch.setitem(PARAMS, "G3_TIE_DELTA", 0)
    r = match_start(" ".join(same + [d]), local_text(SURAH, 5, ayahs))
    assert r["verdict"] == BAD and not r.get("tie")


# --- G5 sets accepted repeats aside ----------------------------------------------------------------------------------

def test_g5_leaves_out_the_ayahs_of_an_accepted_repeat():
    words = V.make_words()
    refs = [[12, p, 99_000, 0] for p in range(1, 7)] * 4 + V.refs_for(words, count=40)  # checkpoints on a pass of 12
    anchors = V.anchors_for(words, held_out_refs=refs)
    rec = V.valid(V.verdict(words, anchors=anchors))
    assert rec["checks"]["G5"]["status"] == "fail"
    accepted = [{"region": ["7:11", "7:13"], "accepted": True, "jumps": [["12:6", "12:2", 40.0, True]], "null": []}]
    rec = V.valid(V.verdict(words, anchors=anchors, repairs=accepted))
    assert rec["checks"]["G5"]["status"] == "pass" and rec["verdict"] == "repaired"


# --- Al-Fatiha's opening ---------------------------------------------------------------------------------------------

def test_al_fatihas_opening_is_also_heard_after_the_basmala(ayahs_real=None):
    ayahs = {(1, a): " ".join(wordlist(20 + a, 4 if a == 1 else 5)) for a in range(1, 8)}
    keys = [k for k, _ in C.key_set(1, ayahs, from_end=False)]
    after = C._key(1, ayahs, False, skip=1)[0]
    assert after in keys and after.split()[0] == C.surah_words(1, ayahs)[4][1]  # starts at ayah 2
    assert 1 not in C.LETTERS_AYAHS and C.OPENING_SKIP[1] == 1  # not a letters ayah: its basmala is 4 words

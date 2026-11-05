"""ASR anchors and anchor cuts on synthetic transcripts and timings. Placeholder letters only."""

import pytest

from recitation_align.align import anchor_cuts
from recitation_align.anchors import _longest_increasing, ayah_anchors, usable_ayahs

# Placeholder ayahs of surah 7: 1 and 2 are a refrain (identical), 3 is short, 4 and 5 are unique.
PLACE = {
    (7, 1): "ابت ثجح خدذ",
    (7, 2): "ابت ثجح خدذ",
    (7, 3): "ف ق",
    (7, 4): "رزس شصض طظع",
    (7, 5): "غفك لمن هوي",
}


def test_refrain_and_short_ayahs_are_not_anchors():
    usable = usable_ayahs(7, PLACE)
    assert set(usable) == {4, 5}


def test_longest_increasing_keeps_one_consistent_chain():
    pairs = [(1, 2), (2, 1), (3, 3), (4, 4)]
    chain = _longest_increasing(pairs)
    assert [a for a, _ in chain] == sorted(a for a, _ in chain)
    assert [c for _, c in chain] == sorted(c for _, c in chain)
    assert len(chain) == 3


def test_anchor_is_the_chunk_where_the_ayah_head_first_appears():
    chunks = [
        {"start_s": 0.0, "text": "نص تجريبي"},
        {"start_s": 30.0, "text": "رزس شصض طظع"},  # ayah 4's head
        {"start_s": 60.0, "text": "غفك لمن هوي"},  # ayah 5's head
    ]
    anchors = ayah_anchors(chunks, 7, PLACE)
    assert anchors == {4: 30.0, 5: 60.0}


def test_anchor_cut_moves_an_ayah_that_left_its_interval():
    # Ayah 5 is anchored to [60, 90] s but the first pass started it at 40 s: cut inside the interval.
    agg = {0: {"start": 40 * 50, "end": 41 * 50, "score": [0.9]}}
    ayah_of_word = [5]
    cuts = anchor_cuts(agg, ayah_of_word, {5: 60.0}, pauses=[])
    assert cuts == [(5, 60 * 50)]


def test_anchor_cut_is_not_made_when_the_first_pass_agrees():
    agg = {0: {"start": 62 * 50, "end": 63 * 50, "score": [0.9]}}
    assert anchor_cuts(agg, [5], {5: 60.0}, pauses=[]) == []


def test_anchor_cut_prefers_a_pause_near_the_target():
    agg = {0: {"start": 10 * 50, "end": 11 * 50, "score": [0.9]}}
    pauses = [(62.0, 63.0), (85.0, 85.5)]  # middles 62.5 (within 5 s of the 60 s target) and 85.25
    cuts = anchor_cuts(agg, [5], {5: 60.0}, pauses=pauses)
    assert cuts == [(5, round(62.5 * 50))]


def test_anchor_cut_ignores_a_pause_further_than_five_seconds():
    agg = {0: {"start": 10 * 50, "end": 11 * 50, "score": [0.9]}}
    cuts = anchor_cuts(agg, [5], {5: 60.0}, pauses=[(70.0, 71.0)])  # middle 70.5 is 10.5 s away
    assert cuts == [(5, 60 * 50)]


def test_anchor_cut_skips_an_inside_pause_that_is_not_closest():
    agg = {0: {"start": 10 * 50, "end": 11 * 50, "score": [0.9]}}
    cuts = anchor_cuts(agg, [5], {5: 60.0}, pauses=[(95.0, 96.0)])  # outside the 60-90 s span
    assert cuts == [(5, 60 * 50)]

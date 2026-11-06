"""Fallback rules of scripts/pilot_published.py (when published timings are not used)."""

import importlib.util
from pathlib import Path

from recitation_align.published import Normalised


def load():
    path = Path(__file__).resolve().parents[1] / "scripts" / "pilot_published.py"
    spec = importlib.util.spec_from_file_location("pilot_published", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


pp = load()


def test_published_timings_that_cover_the_file_are_used():
    norm = Normalised(starts={1: 0, 2: 5000}, ends={1: 5000, 2: 60_000}, published_last_end_ms=40_000)
    assert pp.published_refusal(norm, 60_000) is None  # a 20 s closing tail is ordinary


def test_missing_ayahs_are_refused():
    norm = Normalised(starts={1: 0}, ends={1: 9000}, missing=[2], published_last_end_ms=9000)
    assert "miss ayah(s) [2]" in pp.published_refusal(norm, 9000)


def test_audio_running_long_past_the_published_end_is_refused():
    norm = Normalised(starts={1: 0, 2: 5000}, ends={1: 5000, 2: 333_819}, published_last_end_ms=182_200)
    reason = pp.published_refusal(norm, 333_819)
    assert reason == "published timings end at 182200 ms, 151619 ms before the audio ends"


def test_the_tail_limit_is_exclusive_and_needs_a_published_end():
    at_limit = Normalised(published_last_end_ms=100_000)
    assert pp.published_refusal(at_limit, 100_000 + pp.MAX_UNPUBLISHED_TAIL_MS) is None
    assert pp.published_refusal(Normalised(), 10**9) is None


def test_ayah_spans_follow_the_first_spoken_word_and_end_at_the_file():
    words = [
        {"ayah": 1, "start_ms": 900, "basmala": True},
        {"ayah": 1, "start_ms": 3000},
        {"ayah": 1, "start_ms": 3500},
        {"ayah": 2, "start_ms": 7000},
    ]
    assert pp.ayah_spans(words, 12_000) == {1: (3000, 7000), 2: (7000, 12_000)}


def words_with(confidences):
    return [{"ayah": a, "confidence": c} for a, c in enumerate(confidences, start=1)]


def test_a_few_low_ayahs_do_not_trigger_the_aligner_comparison():
    assert not pp.too_many_low(words_with([0.1] * 4 + [0.9] * 96))  # under 5 ayahs
    assert not pp.too_many_low(words_with([0.1] * 5 + [0.9] * 195))  # 5 is under 5% of 200


def test_many_low_ayahs_trigger_the_aligner_comparison():
    assert pp.too_many_low(words_with([0.1] * 5 + [0.9] * 95))
    assert pp.low_count(words_with([0.1, 0.39, 0.4, 0.9])) == 2


def test_basmala_words_do_not_count_toward_low_ayahs():
    words = [{"ayah": 1, "confidence": 0.0, "basmala": True}, {"ayah": 1, "confidence": 0.8}]
    assert pp.low_count(words) == 0

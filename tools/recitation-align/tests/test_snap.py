"""Pause snapping on synthetic word timings. No model, no ffmpeg (the cache test never runs ffmpeg)."""

import json

import pytest

from recitation_align.pauses import cached_pauses, parse_silencedetect
from recitation_align.snap import snap_to_pauses


def word(ayah, pos, start, end, basmala=False):
    return {"surah": 2, "ayah": ayah, "position": pos, "word": f"w{ayah}.{pos}",
            "basmala": basmala, "start_ms": start, "end_ms": end, "confidence": 0.9}


def two_ayahs():
    # ayah 1: words 1.1 [0, 1000], 1.2 [1000, 2000]; ayah 2: words 2.1 [2400, 3000], 2.2 [3000, 4000]
    return [word(1, 1, 0, 1000), word(1, 2, 1000, 2000), word(2, 1, 2400, 3000), word(2, 2, 3000, 4000)]


def test_snap_with_one_pause_between_the_two_words():
    words = two_ayahs()
    assert snap_to_pauses(words, [(1.9, 2.3)]) == (1, 2)
    assert words[1]["end_ms"] == 1900  # last word of ayah 1 ends at the pause start
    assert words[2]["start_ms"] == 2300  # first word of ayah 2 starts at the pause end
    assert [w.get("snapped") for w in words] == [None, True, True, None]


def test_pause_outside_the_window_is_ignored():
    words = two_ayahs()
    before = [dict(w) for w in words]
    assert snap_to_pauses(words, [(0.2, 0.5)]) == (0, 0)  # boundary at 2.4 s; pause 2 s away
    assert words == before


def test_pause_just_inside_the_window_is_used():
    words = two_ayahs()
    assert snap_to_pauses(words, [(2.3, 2.45)]) == (1, 2)  # inside 2.4 s ± 3 s, after last word start


def test_pause_that_starts_before_the_window_but_overlaps_it_is_used():
    # The 2:25/2:26 case. Boundary at 5400 ms, so the window is 2400-8400 ms. The pause 2200-2600 ms
    # starts before the window but overlaps it, and lies between the last word's start (2000) and the
    # first word's end (6500). Containment would skip it; overlap must snap it.
    words = [word(1, 1, 0, 2000), word(1, 2, 2000, 4900), word(2, 1, 5400, 6500)]
    assert snap_to_pauses(words, [(2.2, 2.6)]) == (1, 2)
    assert words[1]["end_ms"] == 2200
    assert words[2]["start_ms"] == 2600


def test_pause_wholly_before_the_window_is_still_ignored():
    words = [word(1, 1, 0, 2000), word(1, 2, 2000, 4900), word(2, 1, 5400, 6500)]
    before = [dict(w) for w in words]
    assert snap_to_pauses(words, [(0.5, 1.0)]) == (0, 0)  # ends before 2400 ms: no overlap
    assert words == before


def test_pause_inside_an_earlier_word_is_skipped():
    words = two_ayahs()
    before = [dict(w) for w in words]
    # starts before the last word of ayah 1 (1000 ms): the last word is not the one that pauses
    assert snap_to_pauses(words, [(0.9, 1.1)]) == (0, 0)
    assert words == before


def test_pause_that_runs_past_the_next_word_is_skipped():
    words = two_ayahs()
    before = [dict(w) for w in words]
    assert snap_to_pauses(words, [(2.0, 3.5)]) == (0, 0)  # ends after 2.2 s, the first word's end is 3000
    assert words == before


def test_no_word_is_inverted_when_a_pause_would_empty_one():
    words = [word(1, 1, 0, 1000), word(2, 1, 1100, 1200)]  # first word of ayah 2 is only 100 ms
    before = [dict(w) for w in words]
    # the pause ends after the 1.2 s word ends, so the word would be emptied: skipped
    assert snap_to_pauses(words, [(1.05, 1.25)]) == (0, 0)
    assert words == before
    # a pause that fits leaves both words non-empty
    assert snap_to_pauses(words, [(1.05, 1.15)]) == (1, 2)
    assert all(w["start_ms"] < w["end_ms"] for w in words)


def test_longest_pause_wins_when_several_are_in_the_window():
    words = two_ayahs()
    assert snap_to_pauses(words, [(2.05, 2.1), (2.2, 2.6)]) == (1, 2)
    assert words[2]["start_ms"] == 2600  # the longer pause (2.2 to 2.6 s) is used


def test_basmala_is_excluded_from_the_boundary():
    words = [word(1, 1, 0, 800, basmala=True), word(1, 2, 800, 2000), word(2, 1, 2400, 3000)]
    # boundary is ayah 2's first word (2400 ms), the basmala is ignored when picking words
    assert snap_to_pauses(words, [(1.9, 2.3)]) == (1, 2)
    assert words[0].get("snapped") is None  # the basmala word never changes
    assert words[1]["end_ms"] == 1900


def test_only_the_two_words_at_the_boundary_change():
    words = [word(1, 1, 0, 1000), word(1, 2, 1000, 2000), word(2, 1, 2400, 3000), word(2, 2, 3000, 4000)]
    snap_to_pauses(words, [(1.9, 2.3)])
    assert (words[0]["start_ms"], words[0]["end_ms"]) == (0, 1000)
    assert (words[3]["start_ms"], words[3]["end_ms"]) == (3000, 4000)


def test_non_consecutive_ayahs_are_not_snapped():
    words = [word(1, 1, 0, 1000), word(3, 1, 2400, 3000)]
    assert snap_to_pauses(words, [(1.9, 2.3)]) == (0, 0)


def test_no_pauses_leaves_everything_unchanged():
    words = two_ayahs()
    before = [dict(w) for w in words]
    assert snap_to_pauses(words, []) == (0, 0)
    assert words == before
    assert all("snapped" not in w for w in words)


def test_parse_silencedetect_handles_a_trailing_pause_and_rejects_mismatches():
    text = ("[silencedetect @ 0x1] silence_start: 1.5\n"
            "[silencedetect @ 0x1] silence_end: 2.0 | silence_duration: 0.5\n"
            "[silencedetect @ 0x1] silence_start: 9.0\n")
    assert parse_silencedetect(text) == [(1.5, 2.0), (9.0, float("inf"))]
    with pytest.raises(ValueError):
        parse_silencedetect("silence_start: 1.0\nsilence_end: 2.0\nsilence_end: 3.0\n")


def test_cached_pauses_reuses_the_file_and_never_runs_ffmpeg(tmp_path):
    cache = tmp_path / "x.pauses.json"
    cache.write_text(json.dumps({"key": "sha|-22.0|0.25", "pauses": [[1.0, 1.5]]}), encoding="utf-8")
    missing_audio = tmp_path / "does-not-exist.mp3"  # ffmpeg would fail here, so a hit must not touch it
    assert cached_pauses(missing_audio, "sha", cache) == [(1.0, 1.5)]

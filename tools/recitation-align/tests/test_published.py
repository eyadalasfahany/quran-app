"""Published ayah timings: normalisation to QF convention. Numbers only, no Quran text, no network."""

import pytest

from recitation_align.published import PublishedError, normalise


def rows(*pairs, ayah0=None):
    """Published rows as MP3Quran sends them: (ayah, start_time, end_time) in ms."""
    out = [{"ayah": a, "start_time": s, "end_time": e, "polygon": "x", "page": "p", "x": "1", "y": "2"}
           for a, s, e in pairs]
    if ayah0 is not None:
        out.insert(0, {"ayah": 0, "start_time": ayah0[0], "end_time": ayah0[1]})
    return out


def test_ayah_zero_rows_are_dropped_and_counted():
    raw = rows((1, 500, 3000), (2, 3000, 6000), ayah0=(0, 200))
    result = normalise(raw, surah=2, verse_count=2, duration_ms=9000)
    assert result.dropped_ayah0 == 1
    assert sorted(result.starts) == [1, 2]
    assert result.missing == []


def test_ayah_one_starts_at_zero_even_when_published_later():
    raw = rows((1, 500, 3000), (2, 3000, 6000))
    result = normalise(raw, surah=2, verse_count=2, duration_ms=9000)
    assert result.starts[1] == 0
    assert result.ayah1_published_start_ms == 500


def test_each_ayah_ends_where_the_next_starts_and_last_ends_at_duration():
    raw = rows((1, 0, 3000), (2, 3100, 6000), (3, 6200, 7000))
    result = normalise(raw, surah=2, verse_count=3, duration_ms=9123)
    assert result.ends == {1: 3100, 2: 6200, 3: 9123}
    assert result.published_last_end_ms == 7000


def test_end_mismatch_is_counted_when_published_end_differs_from_next_start():
    raw = rows((1, 0, 3000), (2, 3100, 6000), (3, 6200, 7000))
    result = normalise(raw, surah=2, verse_count=3, duration_ms=9000)
    assert result.end_mismatch == 2  # 3000 != 3100 and 6000 != 6200; the last row has no next start


def test_missing_ayah_is_reported_and_not_normalised():
    raw = rows((1, 0, 3000), (3, 6200, 7000))
    result = normalise(raw, surah=2, verse_count=3, duration_ms=9000)
    assert result.missing == [2]
    assert result.starts == {} and result.ends == {}


def test_missing_last_ayah_is_reported():
    raw = rows((1, 0, 3000), (2, 3100, 6000))
    result = normalise(raw, surah=2, verse_count=3, duration_ms=9000)
    assert result.missing == [3]


def test_start_at_or_after_duration_is_refused():
    raw = rows((1, 0, 3000), (2, 9000, 9500))
    with pytest.raises(PublishedError, match="not before the duration"):
        normalise(raw, surah=2, verse_count=2, duration_ms=9000)


def test_out_of_order_starts_are_refused():
    raw = rows((1, 0, 3000), (2, 6000, 7000), (3, 5000, 8000))
    with pytest.raises(PublishedError, match="not strictly increasing"):
        normalise(raw, surah=2, verse_count=3, duration_ms=9000)


def test_ayah_two_at_zero_is_refused_because_ayah_one_would_be_empty():
    raw = rows((1, 0, 0), (2, 0, 6000))
    with pytest.raises(PublishedError, match="not strictly increasing"):
        normalise(raw, surah=2, verse_count=2, duration_ms=9000)


def test_duplicate_ayah_is_refused():
    raw = rows((1, 0, 3000), (1, 100, 3000))
    with pytest.raises(PublishedError, match="appears twice"):
        normalise(raw, surah=2, verse_count=2, duration_ms=9000)


def test_ayah_outside_the_surah_is_refused():
    raw = rows((1, 0, 3000), (5, 3000, 6000))
    with pytest.raises(PublishedError, match="is not in surah"):
        normalise(raw, surah=2, verse_count=2, duration_ms=9000)


@pytest.mark.parametrize("bad", [
    [{"ayah": "1", "start_time": 0, "end_time": 5}],
    [{"ayah": 1, "start_time": 1.5, "end_time": 5}],
    [{"ayah": 1, "start_time": True, "end_time": 5}],
    [{"ayah": 1, "end_time": 5}],
    ["not an object"],
])
def test_malformed_rows_are_refused(bad):
    with pytest.raises(PublishedError):
        normalise(bad, surah=1, verse_count=1, duration_ms=9000)


def test_non_list_payload_is_refused():
    with pytest.raises(PublishedError, match="JSON list"):
        normalise({"ayah": 1}, surah=1, verse_count=1, duration_ms=9000)


def test_count_equals_tanzil_count_for_a_full_surah():
    verse_count = 7
    raw = rows(*[(n, 1000 * n, 1000 * n + 900) for n in range(1, verse_count + 1)])
    result = normalise(raw, surah=1, verse_count=verse_count, duration_ms=9000)
    assert sorted(result.starts) == list(range(1, verse_count + 1))
    assert result.ends[verse_count] == 9000


def test_non_positive_duration_is_refused():
    with pytest.raises(PublishedError, match="positive"):
        normalise(rows((1, 0, 5)), surah=1, verse_count=1, duration_ms=0)

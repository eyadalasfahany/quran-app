"""Anomaly detection, stretch grouping, accept/reject and byte-identity outside spans. Synthetic only."""

from recitation_align.repair import (accept_repair, anomalous_ayahs, ayah_stats, group_stretches, pace,
                                     replace_span)


def w(ayah, pos, start, end, conf=0.9, word="ابت", basmala=None):
    d = {"surah": 2, "ayah": ayah, "position": pos, "word": word, "start_ms": start, "end_ms": end,
         "confidence": conf}
    if basmala is not None:
        d["basmala"] = basmala
    return d


def regular(ayah_count=10, ms_per_token=100, tokens=4):
    """Ayahs of `tokens` letters, each taking tokens*ms_per_token ms, at 0.9 confidence."""
    out, t = [], 0
    for a in range(1, ayah_count + 1):
        dur = tokens * ms_per_token
        out.append(w(a, 1, t, t + dur, word="ابتث"))
        t += dur
    return out


def test_regular_surah_has_no_anomalies():
    words = regular()
    st = ayah_stats(words)
    p = pace(st)
    assert anomalous_ayahs(st, p) == []


def test_too_long_too_short_and_low_confidence_are_anomalies():
    words = regular(ayah_count=8)
    # ayah 3 is 3x too long, ayah 5 is 0.2x too short, ayah 7 has low confidence
    words = [x for x in words if x["ayah"] not in (3, 5, 7)] + [
        w(3, 1, 200, 200 + 3 * 400 * 4 // 4 * 3, word="ابتث"),
        w(5, 1, 1000, 1000 + 80, word="ابتث"),
        w(7, 1, 1500, 1800, conf=0.2, word="ابتث"),
    ]
    st = ayah_stats(words)
    p = pace(st)
    assert set(anomalous_ayahs(st, p)) == {3, 5, 7}


def test_basmala_words_are_not_counted_in_an_ayah():
    words = [w(1, 1, 0, 300, basmala=True, word="ابت"), w(1, 2, 300, 700, word="ابتث")]
    st = ayah_stats(words)
    assert st[1]["start_ms"] == 300 and st[1]["words"] == 1


def test_consecutive_anomalies_group_and_one_good_gap_is_allowed():
    ayahs = list(range(1, 11))
    assert group_stretches([4, 5], ayahs) == [(3, 6)]  # extended by one ayah each side
    assert group_stretches([4, 6], ayahs) == [(3, 7)]  # one good ayah (5) between them: same stretch
    # two good ayahs (5, 6) between: two groups, but their one-ayah extensions touch, so they merge
    assert group_stretches([4, 7], ayahs) == [(3, 8)]
    assert group_stretches([2, 9], ayahs) == [(1, 3), (8, 10)]  # far apart: separate spans


def test_stretch_extension_is_clamped_to_the_surah():
    assert group_stretches([1], [1, 2, 3]) == [(1, 2)]
    assert group_stretches([3], [1, 2, 3]) == [(2, 3)]


def test_overlapping_extended_stretches_merge():
    assert group_stretches([2, 8], list(range(1, 11))) == [(1, 3), (7, 9)]
    assert group_stretches([2, 5], list(range(1, 11))) == [(1, 6)]


def test_no_anomalies_means_no_stretches():
    assert group_stretches([], list(range(1, 5))) == []


def test_repair_is_accepted_only_when_fewer_anomalies_and_higher_confidence():
    before = regular(ayah_count=4)
    p = 100.0
    # before: ayah 2 has low confidence (one anomaly); after: same timing, higher confidence
    before = [dict(x, confidence=0.2) if x["ayah"] == 2 else x for x in before]
    after = [dict(x, confidence=0.9) if x["ayah"] == 2 else x for x in before]
    ok, metrics = accept_repair(before, after, p, {1, 2, 3})
    assert ok is True and metrics["anomalies_after"] < metrics["anomalies_before"]


def test_repair_is_rejected_when_it_does_not_help():
    before = regular(ayah_count=4)
    before = [dict(x, confidence=0.2) if x["ayah"] == 2 else x for x in before]
    same = [dict(x) for x in before]
    ok, metrics = accept_repair(before, same, 100.0, {1, 2, 3})
    assert ok is False
    worse = [dict(x, confidence=0.1) if x["ayah"] == 3 else x for x in before]
    ok2, _ = accept_repair(before, worse, 100.0, {1, 2, 3})
    assert ok2 is False


def test_replace_span_is_byte_identical_outside_the_span():
    words = regular(ayah_count=6)
    outside_before = [x for x in words if x["ayah"] < 3 or x["ayah"] > 4]
    new = [dict(w(3, 1, 999, 1111, word="ابتث")), dict(w(4, 1, 1200, 1400, word="ابتث"))]
    result = replace_span(words, 3, 4, new)
    outside_after = [x for x in result if x["ayah"] < 3 or x["ayah"] > 4]
    assert len(outside_after) == len(outside_before)
    for a, b in zip(outside_before, outside_after):
        assert a is b  # the very same objects: nothing outside the span is rebuilt
    assert [x["ayah"] for x in result] == sorted(x["ayah"] for x in result)
    assert result[2]["start_ms"] == 999

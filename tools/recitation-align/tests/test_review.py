"""Review list: doubtful ayahs, stretch grouping and extension, play window. Synthetic words only."""

from recitation_align.review import (build_review_list, doubtful_ayahs, match_tokens, order_stretches,
                                     play_window, stretch_detail, surah_stretches)


def w(ayah, pos, start, end, conf=0.9, word="ابتث", basmala=None):
    d = {"surah": 2, "ayah": ayah, "position": pos, "word": word, "start_ms": start, "end_ms": end,
         "confidence": conf}
    if basmala is not None:
        d["basmala"] = basmala
    return d


def regular_surah(count=10, ms_per_token=100, tokens=4):
    """Ayahs of `tokens` letters at the same pace, at 0.9 confidence."""
    out, t = [], 0
    for a in range(1, count + 1):
        dur = tokens * ms_per_token
        out.append(w(a, 1, t, t + dur))
        t += dur
    return out


def texts_for(count=10):
    return {(2, a): f"نص تجريبي {a} — ليس ذكرًا" for a in range(1, count + 1)}


def test_regular_surah_has_no_stretches():
    data = {"words": regular_surah(), "basmala_recited": None}
    assert surah_stretches(2, data, texts_for()) == []


def test_long_ayah_and_low_confidence_ayah_make_stretches_extended_one_each_side():
    words = regular_surah()
    # ayah 4 is three times too long (anomaly), ayah 8 is regular in time but has low confidence
    words = [x for x in words if x["ayah"] not in (4, 8)] + [w(4, 1, 300, 300 + 1200), w(8, 1, 3500, 3900, conf=0.2)]
    data = {"words": words, "basmala_recited": None}
    stretches = surah_stretches(2, data, texts_for())
    assert [(s["lo"], s["hi"]) for s in stretches] == [(3, 5), (7, 9)]
    assert [s["id"] for s in stretches] == ["002:3-5", "002:7-9"]
    assert [a["ayah"] for a in stretches[0]["ayahs"]] == [3, 4, 5]
    assert [a["doubtful"] for a in stretches[0]["ayahs"]] == [False, True, False]


def test_list_counts_stretches_ayahs_and_surahs():
    words_a = regular_surah()
    words_a = [x for x in words_a if x["ayah"] != 4] + [w(4, 1, 300, 1500)]
    data = {2: {"words": words_a, "basmala_recited": None}, 3: {"words": regular_surah(), "basmala_recited": None}}
    out = build_review_list(data, {}, "253")
    assert out["moshaf"] == "253"
    assert out["counts"] == {"stretches": 1, "ayahs": 3, "surahs": 1}


def test_audio_file_and_window_for_a_stretch():
    words = [x for x in regular_surah() if x["ayah"] != 4] + [w(4, 1, 300, 1500)]
    stretches = surah_stretches(2, {"words": words, "basmala_recited": None}, texts_for())
    st = stretches[0]
    assert st["audio"] == "002.mp3"
    first, last = st["ayahs"][0], st["ayahs"][-1]
    assert st["window"] == {"start_ms": max(0, first["start_ms"] - 3000), "end_ms": last["end_ms"] + 2000}


def test_play_window_is_clamped_at_zero():
    assert play_window(1000, 5000) == {"start_ms": 0, "end_ms": 7000}
    assert play_window(10000, 12000) == {"start_ms": 7000, "end_ms": 14000}


def test_text_is_passed_through_verbatim():
    texts = {(2, 1): "نص  تجريبيّ ليس ذكرًا"}
    words = regular_surah(count=3)
    words = [x for x in words if x["ayah"] != 1] + [w(1, 1, 0, 1200)]
    stretches = surah_stretches(2, {"words": words, "basmala_recited": None}, texts)
    assert stretches[0]["ayahs"][0]["text"] == texts[(2, 1)]


def test_omitted_basmala_with_low_first_word_confidence_marks_ayah_one():
    words = regular_surah()
    words[0] = w(1, 1, 0, 400, conf=0.3)
    stats, doubtful = doubtful_ayahs(words, basmala_recited=False)
    assert 1 in doubtful
    stats, doubtful = doubtful_ayahs(words, basmala_recited=True)
    assert 1 in doubtful  # low confidence alone still counts
    words[0] = w(1, 1, 0, 400, conf=0.9)
    assert 1 not in doubtful_ayahs(words, basmala_recited=False)[1]


def test_basmala_words_are_not_counted_in_an_ayah_start():
    words = [w(1, 1, 0, 300, basmala=True), w(1, 2, 300, 700)] + regular_surah(count=6)[1:]
    stats, _ = doubtful_ayahs(words, basmala_recited=True)
    assert stats[1]["start_ms"] == 300


def test_stretch_with_a_low_confidence_ayah_is_flagged_and_listed_first():
    # surah 2: an ordinary long ayah (normal confidence). surah 3: a low-confidence ayah (0.2) in a
    # regular surah. Surah 3 must come first although surah 2 is earlier in the Quran.
    long_only = [x for x in regular_surah() if x["ayah"] != 4] + [w(4, 1, 300, 1500)]
    low_conf = [x for x in regular_surah() if x["ayah"] != 6] + [w(6, 1, 2400, 2800, conf=0.2)]
    data = {2: {"words": long_only, "basmala_recited": None}, 3: {"words": low_conf, "basmala_recited": None}}
    out = build_review_list(data, {}, "253")
    assert [s["id"] for s in out["stretches"]] == ["003:5-7", "002:3-5"]
    assert [s["low_confidence"] for s in out["stretches"]] == [True, False]


def test_priority_keeps_surah_order_within_each_group():
    def low(surah):
        words = [x for x in regular_surah() if x["ayah"] != 8] + [w(8, 1, 3500, 3900, conf=0.2)]
        return {"words": words, "basmala_recited": None}

    def long_(surah):
        words = [x for x in regular_surah() if x["ayah"] != 4] + [w(4, 1, 300, 1500)]
        return {"words": words, "basmala_recited": None}

    data = {2: long_(2), 4: low(4), 5: long_(5), 6: low(6)}
    out = build_review_list(data, {}, "253")
    assert [s["id"] for s in out["stretches"]] == ["004:7-9", "006:7-9", "002:3-5", "005:3-5"]


def test_order_function_on_its_own():
    rows = [{"surah": 1, "lo": 1, "hi": 2, "low_confidence": False},
            {"surah": 9, "lo": 4, "hi": 6, "low_confidence": True},
            {"surah": 2, "lo": 2, "hi": 3, "low_confidence": True}]
    assert [(r["surah"], r["lo"]) for r in order_stretches(rows)] == [(2, 2), (9, 4), (1, 1)]


def test_token_matching_keeps_the_verbatim_text_and_skips_waqf_marks():
    # Uthmani display text: diacritics, and a waqf mark that is its own token (no letters, no timing)
    text = "بِسْمِ ۖ ابْتَثَ"
    words = [{"position": 1, "word": "بسم", "start_ms": 0, "end_ms": 100},
             {"position": 3, "word": "ابتث", "start_ms": 200, "end_ms": 400}]
    tokens = match_tokens(text, words)
    assert [t["text"] for t in tokens] == ["بِسْمِ", "ۖ", "ابْتَثَ"]
    assert [(t["start_ms"], t["end_ms"]) for t in tokens] == [(0, 100), (None, None), (200, 400)]
    assert " ".join(t["text"] for t in tokens) == text


def test_token_matching_leaves_unmatched_tokens_without_timing():
    tokens = match_tokens("ابت ثجح", [{"position": 1, "word": "ابت", "start_ms": 5, "end_ms": 9}])
    assert [(t["start_ms"], t["end_ms"]) for t in tokens] == [(5, 9), (None, None)]


def test_stretch_detail_keeps_basmala_words_out_of_the_ayah_span():
    words = [w(1, 1, 0, 300, basmala=True), w(1, 2, 300, 700)]
    data = {"words": words}
    detail = stretch_detail(data, {1: "ابت ثجح"}, 1, 1)
    assert detail[0]["start_ms"] == 300 and detail[0]["end_ms"] == 700
    assert len(detail[0]["tokens"]) == 2


def test_one_display_token_can_cover_two_aligner_words():
    # Uthmani joins the vocative into one token; the simple text (what the aligner used) has two words
    words = [{"position": 1, "word": "يا", "start_ms": 10, "end_ms": 50},
             {"position": 2, "word": "بني", "start_ms": 50, "end_ms": 90},
             {"position": 3, "word": "اذهبوا", "start_ms": 100, "end_ms": 160}]
    tokens = match_tokens("يَـٰبَنِىَّ ٱذْهَبُوا۟", words)
    assert [(t["start_ms"], t["end_ms"]) for t in tokens] == [(10, 90), (100, 160)]

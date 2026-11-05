"""Apply marks: exact fixed starts, words inside their ayah span, outside words byte-identical.

Synthetic emissions only (no model): every token has a two-frame peak at a known frame with blank
frames between tokens, so the true word spans are known. The real torchaudio forced aligner runs on them.
`mpf` is the audio's measured ms per frame; a value other than 20 checks that the conversion follows
the measured length, as run does, instead of assuming 50 frames per second.
"""

import json

import pytest
import torch

from recitation_align.align import surah_tokens
from recitation_align.apply_marks import affected_ranges, apply_marks_dir, apply_to_surah, ms_per_frame

SURAH = 5
VOCAB = {"<pad>": 0, "ا": 1, "ب": 2, "ت": 3, "ث": 4}
WIDTH, GAP = 2, 3
# Surah 1's ayah 1 is the basmala; it must not be a prefix of this surah's ayah 1 (no basmala here).
AYAHS = {
    (1, 1): "ثثث",
    (SURAH, 1): "ابت ثاب",
    (SURAH, 2): "تاب",
    (SURAH, 3): "ابتث ب",
    (SURAH, 4): "ثتا ابا",
    (SURAH, 5): "تبا",
    (SURAH, 6): "ابت",
}
ALL_AYAHS = [1, 2, 3, 4, 5, 6]
SETTINGS = dict(max_tokens=1500, lookahead_tokens=200, slack=2.0, star_penalty=1.0)


def truth(lead=10, mpf=20.0):
    """Words of surah 5 with their true spans (ms = frame * mpf), the emission grid, and the duration."""
    sw, tokens, wot, _ = surah_tokens(SURAH, AYAHS, 1, 6, False, VOCAB)
    starts = [lead + i * (WIDTH + GAP) for i in range(len(tokens))]
    words = []
    for wi, (ayah, pos, text, _) in enumerate(sw):
        idx = [t for t, x in enumerate(wot) if x == wi]
        first, last = starts[idx[0]], starts[idx[-1]]
        words.append({"surah": SURAH, "ayah": ayah, "position": pos, "word": text,
                      "start_ms": round(first * mpf), "end_ms": round((last + WIDTH) * mpf), "confidence": 0.9})
    frames = starts[-1] + WIDTH + 20
    em = torch.full((frames, len(VOCAB)), -10.0)
    em[:, 0] = 0.0
    for tok, s in zip(tokens, starts):
        em[s:s + WIDTH, 0] = -10.0
        em[s:s + WIDTH, tok] = 0.0
    return words, em, round(frames * mpf)


def surah_data(words, duration_ms):
    return {"surah": SURAH, "audio": {"duration_ms": duration_ms}, "words": words}


def ayah_start(words, a):
    return min(w["start_ms"] for w in words if w["ayah"] == a)


def ayah_end(words, a):
    return max(w["end_ms"] for w in words if w["ayah"] == a)


def check_inside_span(words, marks, lo, hi, next_start):
    """Every word of ayahs lo..hi lies inside its ayah's span, marked starts are exact, reading order holds."""
    for a in [x for x in ALL_AYAHS if lo <= x <= hi]:
        ws = sorted((w for w in words if w["ayah"] == a), key=lambda w: w["position"])
        nxt = next_start if a == hi else ayah_start(words, a + 1)
        assert all(w["start_ms"] >= ayah_start(words, a) and w["end_ms"] <= nxt for w in ws)
        if a in marks:
            assert ws[0]["start_ms"] == marks[a]
    ordered = sorted((w for w in words if lo <= w["ayah"] <= hi), key=lambda w: (w["ayah"], w["position"]))
    for prev, cur in zip(ordered, ordered[1:]):
        assert cur["start_ms"] >= prev["end_ms"]  # no overlaps, in reading order


def test_ms_per_frame_is_the_measured_length():
    assert ms_per_frame(7237146, 361496) == pytest.approx(7237146 / 361496)  # 002: about 20.02 ms, not 20
    with pytest.raises(ValueError):
        ms_per_frame(1000, 0)


def test_affected_ranges_extend_to_the_ayah_before_a_mark_on_the_first_ayah():
    assert affected_ranges(ALL_AYAHS, {3: 1}, [(3, 5)]) == [(2, 5)]
    assert affected_ranges(ALL_AYAHS, {4: 1}, [(3, 5)]) == [(3, 5)]
    assert affected_ranges(ALL_AYAHS, {4: 1}, []) == [(3, 4)]  # no reviewed stretch: the ayah alone
    assert affected_ranges(ALL_AYAHS, {4: 1, 6: 2}, [(3, 5), (6, 6)]) == [(3, 6)]  # adjacent ranges merge
    assert affected_ranges(ALL_AYAHS, {}, [(3, 5)]) == []


def test_marked_start_is_exact_and_the_ayah_before_ends_there():
    words, em, dur = truth()
    mark = ayah_start(words, 3)  # the true start of ayah 3
    before = json.loads(json.dumps(words))
    new, ranges = apply_to_surah(surah_data(words, dur), ayahs=AYAHS, marks={3: mark}, reviewed=[(2, 4)],
                                 em=em, vocab=VOCAB, settings=SETTINGS)
    assert ranges == [(2, 4)]
    out = new["words"]
    assert ayah_start(out, 3) == mark
    assert ayah_end(out, 2) <= mark
    assert new["manual_marks"] == [{"ayah": 3, "start_ms": mark}]
    check_inside_span(out, {3: mark}, 2, 4, ayah_start(before, 5))


def test_shifted_mark_is_fixed_and_words_stay_inside_their_spans():
    words, em, dur = truth()
    mark = ayah_start(words, 3) + 60  # three frames later than the true start
    new, _ = apply_to_surah(surah_data(words, dur), ayahs=AYAHS, marks={3: mark}, reviewed=[(2, 4)],
                            em=em, vocab=VOCAB, settings=SETTINGS)
    out = new["words"]
    assert ayah_start(out, 3) == mark
    assert ayah_end(out, 2) <= mark
    check_inside_span(out, {3: mark}, 2, 4, ayah_start(words, 5))


def test_late_mark_on_a_long_file_uses_the_measured_frame_length():
    # 40 000 frames of silence before the words, and 20.02 ms per frame: 800 s in, a fixed 20 ms
    # conversion would be about 800 ms off. The re-aligned words must still sit on their true spans.
    mpf = 20.02
    words, em, dur = truth(lead=40000, mpf=mpf)
    mark = ayah_start(words, 4)
    new, _ = apply_to_surah(surah_data(words, dur), ayahs=AYAHS, marks={4: mark}, reviewed=[(3, 4)],
                            em=em, vocab=VOCAB, settings=SETTINGS)
    out = new["words"]
    assert ayah_start(out, 4) == mark
    truth_ms = {(w["ayah"], w["position"]): w["start_ms"] for w in words}
    for w in out:
        if w["ayah"] == 4 and w["position"] != 1:
            assert abs(w["start_ms"] - truth_ms[(4, w["position"])]) <= 3 * mpf


def test_words_outside_the_range_are_byte_identical():
    words, em, dur = truth()
    mark = ayah_start(words, 4)
    new, ranges = apply_to_surah(surah_data(words, dur), ayahs=AYAHS, marks={4: mark}, reviewed=[(3, 4)],
                                 em=em, vocab=VOCAB, settings=SETTINGS)
    assert ranges == [(3, 4)]
    outside_before = [w for w in words if w["ayah"] not in (3, 4)]
    outside_after = [w for w in new["words"] if w["ayah"] not in (3, 4)]
    assert json.dumps(outside_before, ensure_ascii=False) == json.dumps(outside_after, ensure_ascii=False)


def test_a_mark_on_the_first_ayah_clips_the_ayah_before_it():
    words, em, dur = truth()
    mark = ayah_start(words, 2)
    new, ranges = apply_to_surah(surah_data(words, dur), ayahs=AYAHS, marks={2: mark}, reviewed=[(2, 3)],
                                 em=em, vocab=VOCAB, settings=SETTINGS)
    assert ranges == [(1, 3)]
    assert ayah_start(new["words"], 2) == mark
    assert ayah_end(new["words"], 1) <= mark
    # ayah 1 was re-aligned in its own span, which ends at the mark; ayahs after the range are unchanged
    assert [w for w in new["words"] if w["ayah"] > 3] == [w for w in words if w["ayah"] > 3]


def test_snapping_moves_a_boundary_to_the_pause_inside_the_range():
    words, em, dur = truth()
    gap_start = ayah_end(words, 3) / 1000  # the silence between ayah 3 and ayah 4 is one blank run
    gap_end = ayah_start(words, 4) / 1000
    pauses = [(gap_start, gap_end)]
    new, _ = apply_to_surah(surah_data(words, dur), ayahs=AYAHS, marks={2: ayah_start(words, 2)},
                            reviewed=[(2, 4)], em=em, vocab=VOCAB, settings=SETTINGS, pauses=pauses)
    out = new["words"]
    assert ayah_end(out, 3) == round(gap_start * 1000)  # the last word of ayah 3 ends at the pause
    assert ayah_start(out, 4) == round(gap_end * 1000)  # the first word of ayah 4 starts at the pause end
    assert any(w.get("snapped") for w in out if w["ayah"] in (3, 4))
    assert [w for w in out if w["ayah"] > 4] == [w for w in words if w["ayah"] > 4]


def test_marks_out_of_order_are_refused():
    words, em, dur = truth()
    with pytest.raises(ValueError, match="not in order"):
        apply_to_surah(surah_data(words, dur), ayahs=AYAHS,
                       marks={3: ayah_start(words, 4) + 100, 4: ayah_start(words, 4)},
                       reviewed=[(3, 4)], em=em, vocab=VOCAB, settings=SETTINGS)


def test_mark_for_an_unknown_ayah_is_refused():
    words, em, dur = truth()
    with pytest.raises(ValueError, match="not in the surah"):
        apply_to_surah(surah_data(words, dur), ayahs=AYAHS, marks={99: 1}, reviewed=[], em=em,
                       vocab=VOCAB, settings=SETTINGS)


def test_batch_copies_unmarked_surahs_byte_for_byte_and_applies_marked_ones(tmp_path):
    src, out = tmp_path / "v7", tmp_path / "v8"
    src.mkdir()
    words, em, dur = truth()
    marked = {"surah": SURAH, "tool_version": "0.1.0", "basmala_recited": None, "repairs": [],
              "audio": {"duration_ms": dur}, "words": words}
    (src / "005.json").write_text(json.dumps(marked, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    raw_other = b'{"surah":6,  "words":[]}  \n'  # deliberately unusual bytes: must be copied as they are
    (src / "006.json").write_bytes(raw_other)
    (src / "005.log").write_text("log", encoding="utf-8")  # logs are not part of the output
    marks = {"253": {"005": {"3": ayah_start(words, 3)}}, "reviewed": ["005:2-4"]}
    summary = apply_marks_dir(src, out, marks, ayahs=AYAHS, emissions_for=lambda s: em, vocab=VOCAB,
                              settings=SETTINGS)
    assert (out / "006.json").read_bytes() == raw_other
    assert not (out / "005.log").exists()
    result = json.loads((out / "005.json").read_text(encoding="utf-8"))
    assert result["manual_marks"] == [{"ayah": 3, "start_ms": ayah_start(words, 3)}]
    assert ayah_start(result["words"], 3) == ayah_start(words, 3)
    assert summary == {"surahs": 2, "copied": 1, "changed": 1, "marks": 1, "ranges": 1, "missing": [],
                       "failed": []}


def test_a_failing_surah_is_kept_unchanged_and_reported(tmp_path):
    src, out = tmp_path / "v7", tmp_path / "v8"
    src.mkdir()
    words, em, dur = truth()
    raw = json.dumps(surah_data(words, dur)).encode("utf-8")
    (src / "005.json").write_bytes(raw)
    bad = {"253": {"005": {"3": ayah_start(words, 4) + 100, "4": ayah_start(words, 4)}}, "reviewed": []}
    summary = apply_marks_dir(src, out, bad, ayahs=AYAHS, emissions_for=lambda s: em, vocab=VOCAB,
                              settings=SETTINGS)
    assert (out / "005.json").read_bytes() == raw
    assert summary["failed"] and summary["failed"][0]["surah"] == 5
    assert summary["changed"] == 0


def test_batch_refuses_to_write_over_its_input(tmp_path):
    src = tmp_path / "v7"
    src.mkdir()
    with pytest.raises(ValueError, match="separate output"):
        apply_marks_dir(src, src, {"253": {}, "reviewed": []}, ayahs=AYAHS,
                        emissions_for=lambda s: None, vocab=VOCAB, settings=SETTINGS)


def test_batch_reports_marks_for_surahs_without_a_file(tmp_path):
    src, out = tmp_path / "v7", tmp_path / "v8"
    src.mkdir()
    (src / "006.json").write_text('{"surah": 6, "words": []}', encoding="utf-8")
    summary = apply_marks_dir(src, out, {"253": {"009": {"1": 0}}, "reviewed": []}, ayahs=AYAHS,
                              emissions_for=lambda s: None, vocab=VOCAB, settings=SETTINGS)
    assert summary["missing"] == [9]

"""Gate verdicts (plan way2quran-quality Q6a): G0-G6, stretch, held-out (G5), end coverage (G2), the middle gap and
the gate record's shape. Placeholder words and verse keys only: no Quran text, no model, no network. The
transcription is faked.
"""

import importlib.util
import json
from pathlib import Path

import numpy as np
import pytest

import test_report as TR  # the Q1 record builders (tests/ is on sys.path)
from recitation_align import gate
from recitation_align import report as R
from recitation_align.gate import (BAD, OK, UNSURE, end_coverage, held_out_stats, low_conf_ayahs, middle_gap,
                                   stretched_words, surah_pace, surah_verdict)
from recitation_align.quality import PARAMS, tool_version
from recitation_align.text import norm

TOOL = Path(__file__).resolve().parents[1]
SURAH = 7
SHA = TR.sha("surah 7")
GIBBERISH = "غغغغ ظظظظ ضضضض"  # PLACEHOLDER letters
LETTERS = "بتثجحخدذرزسشصضطظعغ"  # PLACEHOLDER letters: the fixtures hold no Quran text


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, TOOL / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


w2q_gate = load_script("w2q_gate")


def placeholder(i: int, n: int = 4) -> str:
    return "".join(LETTERS[(i * 3 + k * 5) % len(LETTERS)] for k in range(n))


def comp(verdict="complete", ayah_count=30, **extra):
    rec = TR.completeness(SURAH, ayah_count=ayah_count, verdict=verdict, stored=False)
    rec.update(sha256=SHA, tool_version=tool_version(), **extra)
    return rec


def make_words(n_ayahs=30, per=6, dur_ms=400, conf=0.9, surah=SURAH):
    """Ayah a holds `per` words, 500 ms apart, `dur_ms` long."""
    out = []
    for a in range(1, n_ayahs + 1):
        for p in range(1, per + 1):
            start = ((a - 1) * per + (p - 1)) * 500
            out.append({"surah": surah, "ayah": a, "position": p, "word": placeholder(a * 7 + p),
                        "start_ms": start, "end_ms": start + dur_ms, "confidence": conf})
    return out


def ok_results(n_ayahs=30, bad=(), unsure=()):
    out = {}
    for a in range(2, n_ayahs + 1):
        v = BAD if a in bad else (UNSURE if a in unsure else OK)
        out[a] = {"verdict": v, "heard": f"{a - 1}:3" if v == BAD else f"{a}:0", "score": 90.0}
    return out


def refs_for(words, count=40, off_ms=0):
    out = []
    for w in words[:count]:
        out.append([w["ayah"], w["position"], w["start_ms"] + off_ms, w["start_ms"]])
    return out


def anchors_for(words, **kw):
    return {"cuts": [], "pace_breaks": [], "held_out": [], "held_out_refs": refs_for(words), **kw}


def good_g2():
    return {"last_ayah": OK, "last_word": OK, "tail_s": 3.0, "tail_ok": True, "status": "pass"}


def verdict(words=None, *, g3_results=None, g2=None, anchors=None, c=None, refusal=None, **kw):
    words = words if words is not None else make_words()
    c = c or comp()
    return surah_verdict(
        SURAH, c, refusal=refusal, words=words, anchors=anchors if anchors is not None else anchors_for(words),
        g2=g2 or good_g2(), g3={"results": g3_results if g3_results is not None else ok_results(), "unprobed": [],
                                "moved": {}}, **kw)


def valid(record):
    R.validate_gate(record)
    return record


# --- the G0-G6 table ----------------------------------------------------------------------------------------------

def test_g0_an_incomplete_surah_is_unavailable_with_the_completeness_reason():
    rec = valid(surah_verdict(SURAH, comp("incomplete-both")))
    assert rec["verdict"] == "unavailable" and rec["reasons"] == ["incomplete-both"]
    assert rec["checks"]["G0"] == "incomplete-both" and rec["segments_null"] == []


def test_g1_a_refusal_is_no_highlight_with_reason_g1():
    rec = valid(surah_verdict(SURAH, comp(), refusal={"schema": 1, "surah": SURAH, "stage": "anchors", "reason": "x"}))
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["G1"]
    assert rec["checks"]["G1"] == "refused (anchors)"


def test_a_clean_surah_passes_and_every_check_is_filled():
    rec = valid(verdict())
    assert rec["verdict"] == "pass" and rec["reasons"] == [] and rec["segments_null"] == []
    c = rec["checks"]
    assert c["G0"] == "complete" and c["G1"] == "ok" and c["G2"]["status"] == "pass"
    assert c["G3"] == {"n": 29, "ok": 29, "bad": 0, "unsure": 0, "failed": [], "unprobed": [], "moved": {}}
    assert c["G5"]["status"] == "pass" and c["G5"]["n"] == 40 and c["G6"]["low_conf_ayahs"] == []
    assert c["stretch"]["words"] == [] and c["middle_gap"]["unavailable"] is False
    assert rec["sha256"] == SHA and rec["tool_version"] == tool_version()


def test_g3_bad_or_unsure_needs_repair_which_is_no_highlight_in_q6a():
    for kw in ({"bad": {12}}, {"unsure": {12}}):
        rec = valid(verdict(g3_results=ok_results(**kw)))
        assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["needs-repair"]
        assert rec["checks"]["G3"]["failed"] == [12] and rec["checks"]["triggers"]["G3"] == [12]
    bad = valid(verdict(g3_results=ok_results(bad={12})))
    assert bad["probes"] == [[f"{SURAH}:12", "11:3", "BAD", 90]]


def test_g2_failing_needs_repair():
    g2 = dict(good_g2(), last_word=BAD, status="fail")
    rec = valid(verdict(g2=g2))
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["needs-repair"]
    assert rec["checks"]["triggers"]["G2"] is True


def test_g5_failing_needs_repair_and_below_twenty_words_it_is_not_applied():
    words = make_words()
    rec = valid(verdict(words, anchors=anchors_for(words, held_out_refs=refs_for(words, 40, off_ms=900))))
    assert rec["checks"]["G5"]["status"] == "fail"
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["needs-repair"]
    few = valid(verdict(words, anchors=anchors_for(words, held_out_refs=refs_for(words, 19, off_ms=900))))
    assert few["checks"]["G5"]["status"] == "n/a" and few["verdict"] == "pass"


def test_a_held_out_ayah_checkpoint_more_than_one_second_away_needs_repair():
    words = make_words()
    start = gate.ayah_starts(words)[9]
    rec = valid(verdict(words, anchors=anchors_for(words, held_out=[[9, round(start * 1000) - 1500, round(start * 1000)]])))
    assert rec["checks"]["G5"]["outlier_ayahs"] == [9]
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["needs-repair"]


def test_g6_low_confidence_ayahs_are_segments_null_and_ship():
    words = make_words()
    for w in words:
        if w["ayah"] in (4, 20):
            w["confidence"] = 0.2
    rec = valid(verdict(words))
    assert rec["verdict"] == "pass" and rec["segments_null"] == [4, 20]
    assert rec["checks"]["G6"]["low_conf_ayahs"] == [4, 20]


def test_the_basmala_is_left_out_of_the_confidence_floor():
    words = make_words()
    for w in words:
        if w["ayah"] == 1 and w["position"] <= 2:
            w["basmala"] = True
            w["confidence"] = 0.0
    assert low_conf_ayahs(words) == []


def test_more_than_ten_percent_nulled_is_no_highlight():
    words = make_words()
    for w in words:
        if w["ayah"] in (3, 6, 9, 12):  # 4 of 30 is 13%
            w["confidence"] = 0.2
    rec = valid(verdict(words))
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["segments-null-share"]
    for w in words:
        if w["ayah"] == 12:
            w["confidence"] = 0.9
    assert valid(verdict(words))["verdict"] == "pass"  # 3 of 30 is exactly 10%


def test_a_lone_pace_break_is_a_flag_and_not_a_reason():
    words = make_words()
    brk = {"from_s": 100.0, "to_s": 220.0, "from_ayah": 5, "to_ayah": 12, "pace_x": 2.4, "status": "jump"}
    rec = valid(verdict(words, anchors=anchors_for(words, pace_breaks=[brk])))
    assert rec["verdict"] == "pass" and rec["reasons"] == []
    assert rec["checks"]["middle_gap"]["flag"] is True and rec["checks"]["middle_gap"]["unavailable"] is False


# --- stretch ------------------------------------------------------------------------------------------------------

def test_stretch_catches_a_long_non_final_word_whatever_its_confidence():
    """The 5:31 pattern: 8.6 s on a non-final word at confidence 0.988 (placeholder position)."""
    words = make_words()
    w = next(x for x in words if x["ayah"] == 11 and x["position"] == 2)
    w["end_ms"] = w["start_ms"] + 8600
    w["confidence"] = 0.988
    found = stretched_words(words, surah_pace(words))
    assert found == [[f"{SURAH}:11", 2, 8600]]
    rec = valid(verdict(words))
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["needs-repair"]
    assert rec["checks"]["stretch"]["words"] == [[f"{SURAH}:11", 2, 8600]]


def test_stretch_catches_a_long_first_word_at_low_confidence():
    """The 5:85 pattern: a 4.4 s first word at confidence 0.42 (placeholder position)."""
    words = make_words()
    w = next(x for x in words if x["ayah"] == 8 and x["position"] == 1)
    w["end_ms"] = w["start_ms"] + 4400
    w["confidence"] = 0.42
    assert stretched_words(words, surah_pace(words)) == [[f"{SURAH}:8", 1, 4400]]


def test_a_long_final_word_or_a_short_stretch_is_not_flagged():
    words = make_words()
    final = next(x for x in words if x["ayah"] == 5 and x["position"] == 6)
    final["end_ms"] = final["start_ms"] + 9000
    short = next(x for x in words if x["ayah"] == 6 and x["position"] == 2)
    short["end_ms"] = short["start_ms"] + 2400  # more than 4x its letters, but not more than 2.5 s
    assert stretched_words(words, surah_pace(words)) == []


def test_the_opening_letters_are_counted_as_spelled_out_not_as_the_written_token():
    """Surah 15 opens with letter names (MUQATTAAT), recited slowly: a 3.8 s opening word is not a stretch."""
    words = make_words(surah=15)
    first = next(x for x in words if x["ayah"] == 1 and x["position"] == 1)
    first["word"] = placeholder(1, 3)  # three written letters, eight spoken
    first["end_ms"] = first["start_ms"] + 3800
    assert stretched_words(words, surah_pace(words)) == []
    other = make_words(surah=5)  # the same word in a surah with no opening letters is a stretch
    other[0]["word"] = placeholder(1, 3)
    other[0]["end_ms"] = other[0]["start_ms"] + 3800
    assert stretched_words(other, surah_pace(other)) == [["5:1", 1, 3800]]


# --- G5 -----------------------------------------------------------------------------------------------------------

def test_held_out_stats_without_regions_reproduces_the_anchors_counts():
    words = make_words()
    refs = [[w["ayah"], w["position"], w["start_ms"] + off, w["start_ms"]]
            for w, off in zip(words[:50], [0] * 40 + [100, 200, 350, 400, 800, -20, 0, 10, 0, 0])]
    stats = held_out_stats({"held_out_refs": refs}, words)
    diffs = sorted(abs(r[2] - r[3]) for r in refs)
    assert stats["n"] == 50 and stats["share_300ms"] == round(sum(d <= 300 for d in diffs) / 50, 4)
    assert stats["median_ms"] == 0 and stats["set_aside"] == 0


def test_regions_are_set_aside_before_g5_is_scored():
    words = make_words()
    refs = refs_for(words, 60)
    for r in refs:
        if r[0] in (4, 5):
            r[2] += 2000  # a repeat region: the checkpoint disagrees with the final start
    assert held_out_stats({"held_out_refs": refs}, words)["status"] == "fail"
    kept = held_out_stats({"held_out_refs": refs}, words, regions=[(4, 5)])
    assert kept["status"] == "pass" and kept["set_aside"] == 12 and kept["n"] == 48


def test_g5_reads_the_final_start_from_the_words():
    words = make_words()
    refs = refs_for(words, 30)
    moved = [dict(w) for w in words]
    for w in moved:
        if w["ayah"] == 3:
            w["start_ms"] += 600
    assert held_out_stats({"held_out_refs": refs}, words)["status"] == "pass"
    assert held_out_stats({"held_out_refs": refs}, moved)["status"] == "fail"


def test_g3_failures_and_stretch_set_aside_their_neighbourhood_for_g5():
    words = make_words()
    refs = refs_for(words, 60)
    for r in refs:
        if 11 <= r[0] <= 12:
            r[2] += 2000
    rec = valid(verdict(words, g3_results=ok_results(bad={11}), anchors=anchors_for(words, held_out_refs=refs)))
    assert rec["checks"]["G5"]["status"] == "pass" and rec["checks"]["G5"]["set_aside"] > 0
    assert rec["reasons"] == ["needs-repair"]  # the G3 failure still needs repair


# --- middle gap ---------------------------------------------------------------------------------------------------

JUMP = {"from_s": 100.0, "to_s": 220.0, "from_ayah": 8, "to_ayah": 16, "pace_x": 2.4, "status": "jump"}


def test_a_pace_break_alone_is_a_flag():
    gap = middle_gap({"pace_breaks": [JUMP]}, ok_results())
    assert gap["flag"] is True and gap["unavailable"] is False


def test_g3_failures_alone_give_needs_repair_not_unavailable():
    words = make_words()
    rec = valid(verdict(words, g3_results=ok_results(bad={9, 10, 11})))
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["needs-repair"]
    assert rec["checks"]["middle_gap"]["unavailable"] is False


def test_a_jump_with_three_consecutive_g3_failures_inside_is_unavailable():
    words = make_words()
    anchors = anchors_for(words, pace_breaks=[JUMP])
    rec = valid(verdict(words, anchors=anchors, g3_results=ok_results(bad={9, 10}, unsure={11})))
    assert rec["verdict"] == "unavailable" and rec["reasons"] == ["incomplete-middle"]
    assert rec["checks"]["middle_gap"]["breaks"][0]["g3_run"] == 3
    assert rec["segments_null"] == []


def test_two_failures_or_failures_that_are_not_consecutive_are_not_a_gap():
    assert middle_gap({"pace_breaks": [JUMP]}, ok_results(bad={9, 10}))["unavailable"] is False
    assert middle_gap({"pace_breaks": [JUMP]}, ok_results(bad={9, 10, 12, 13}))["unavailable"] is False
    assert middle_gap({"pace_breaks": [JUMP]}, ok_results(bad={20, 21, 22}))["unavailable"] is False  # outside it


def test_a_resolved_break_is_never_a_gap():
    gap = middle_gap({"pace_breaks": [dict(JUMP, status="resolved")]}, ok_results(bad={9, 10, 11}))
    assert gap["flag"] is False and gap["unavailable"] is False


# --- G2 end coverage ----------------------------------------------------------------------------------------------

def tiny_ayahs(n=6, per=5):
    return {(SURAH, a): " ".join(placeholder(a * 11 + p, 5) for p in range(per)) for a in range(1, n + 1)}


def tiny_words(ayahs, gap_ms=10000):
    out = []
    for (s, a), text in sorted(ayahs.items()):
        for p, w in enumerate(text.split(), 1):
            start = a * gap_ms + (p - 1) * 500
            out.append({"surah": s, "ayah": a, "position": p, "word": w, "start_ms": start, "end_ms": start + 400,
                        "confidence": 0.9})
    return out


class Hear:
    """A fake transcriber: a clip starting near an ayah start hears its first words; the last-word clip hears
    `last` (default the true last word)."""

    def __init__(self, ayahs, words, last=None, ayah_text=None):
        self.ayahs, self.words, self.last, self.ayah_text = ayahs, words, last, ayah_text
        self.starts = {}
        for w in words:
            self.starts[w["start_ms"]] = w

    def __call__(self, wav, clips, batch=1):
        out = []
        last = self.words[-1]
        for s, e in clips:
            if abs((e - s) - (PARAMS["G4_PRE_S"] + PARAMS["G4_POST_S"])) < 1e-6:
                t = s + PARAMS["G4_PRE_S"]
                text = self.last if self.last is not None and abs(t * 1000 - last["start_ms"]) < 1 else last["word"]
            else:
                a = round((s + PARAMS["G3_PRE_S"]) * 1000 / 10000)
                text = self.ayah_text(a) if self.ayah_text else " ".join(self.ayahs[(SURAH, a)].split()[:5])
            out.append({"start_s": s, "end_s": e, "text": text})
        return {"clips": out, "seconds": 0.0}


def run_end(ayahs, words, hear, *, duration_s, trailing=None):
    c = comp(ayah_count=len(ayahs), trailing_s=trailing)
    return end_coverage(np.zeros(16000, dtype=np.float32), words, SURAH, ayahs, hear, {}, c, duration_s)


def test_end_coverage_passes_when_the_last_start_and_word_are_heard_and_the_tail_is_short():
    ayahs = tiny_ayahs()
    words = tiny_words(ayahs)
    r = run_end(ayahs, words, Hear(ayahs, words), duration_s=words[-1]["end_ms"] / 1000 + 7.9)
    assert r["last_ayah"] == OK and r["last_word"] == OK and r["tail_s"] == 7.9 and r["status"] == "pass"


def test_end_coverage_fails_on_a_wrong_last_word():
    ayahs = tiny_ayahs()
    words = tiny_words(ayahs)
    other = words[-4]["word"]
    r = run_end(ayahs, words, Hear(ayahs, words, last=other), duration_s=words[-1]["end_ms"] / 1000 + 3)
    assert r["last_word"] == BAD and r["status"] == "fail"
    empty = run_end(ayahs, words, Hear(ayahs, words, last=""), duration_s=words[-1]["end_ms"] / 1000 + 3)
    assert empty["last_word"] == UNSURE and empty["status"] == "fail"


def test_end_coverage_fails_on_a_wrong_last_ayah_start():
    ayahs = tiny_ayahs()
    words = tiny_words(ayahs)
    wrong = Hear(ayahs, words, ayah_text=lambda a: " ".join(ayahs[(SURAH, a - 1)].split()[1:5]))
    r = run_end(ayahs, words, wrong, duration_s=words[-1]["end_ms"] / 1000 + 3)
    assert r["last_ayah"] != OK and r["status"] == "fail"


def test_the_last_word_may_carry_a_clipped_prefix_but_not_earlier_words():
    ctx = [placeholder(i, 5) for i in (1, 2, 3, 4)]
    assert gate._last_word_verdict(ctx[3], ctx)["verdict"] == OK
    assert gate._last_word_verdict("ظ" + ctx[3], ctx)["verdict"] == OK  # a one-letter prefix
    assert gate._last_word_verdict(" ".join(ctx[2:]), ctx)["verdict"] == BAD  # the word before it is heard first
    assert gate._last_word_verdict(ctx[2], ctx)["verdict"] == BAD
    assert gate._last_word_verdict(GIBBERISH, ctx)["verdict"] == UNSURE


def test_the_tail_is_ok_up_to_sixty_seconds_or_the_measured_trailing_time():
    ayahs = tiny_ayahs()
    words = tiny_words(ayahs)
    end_s = words[-1]["end_ms"] / 1000
    hear = Hear(ayahs, words)
    assert run_end(ayahs, words, hear, duration_s=end_s + 60)["tail_ok"] is True
    assert run_end(ayahs, words, hear, duration_s=end_s + 61)["tail_ok"] is False
    assert run_end(ayahs, words, hear, duration_s=end_s + 120, trailing=118.0)["tail_ok"] is True
    assert run_end(ayahs, words, hear, duration_s=end_s + 120, trailing=20.0)["tail_ok"] is False


# --- the script ---------------------------------------------------------------------------------------------------

def test_gate_surah_runs_the_probes_and_passes_a_true_document():
    ayahs = tiny_ayahs()
    words = tiny_words(ayahs)
    doc = {"audio": {"sha256": SHA, "duration_ms": words[-1]["end_ms"] + 4000}, "words": words,
           "anchors": {"cuts": [], "pace_breaks": [], "held_out": [], "held_out_refs": []}}
    c = comp(ayah_count=len(ayahs))
    rec = w2q_gate.gate_surah(SURAH, c, doc=doc, refusal=None, ayahs=ayahs, wav=np.zeros(16000, dtype=np.float32),
                              transcribe_clips=Hear(ayahs, words))
    valid(rec)
    assert rec["verdict"] == "pass" and rec["checks"]["G3"]["n"] == len(ayahs) - 1
    assert rec["checks"]["G4"]["n"] >= 0 and set(rec["seconds"]) == {"g3", "g4", "g2"}


def test_gate_surah_does_not_decode_the_audio_for_g0_or_g1():
    def boom():
        raise AssertionError("the audio must not be read")

    unavailable = w2q_gate.gate_surah(SURAH, comp("incomplete-end"), doc=None, refusal=None, ayahs={}, wav=boom,
                                      transcribe_clips=None)
    assert unavailable["verdict"] == "unavailable"
    refused = w2q_gate.gate_surah(SURAH, comp(), doc=None, ayahs={}, wav=boom, transcribe_clips=None,
                                  refusal={"schema": 1, "surah": SURAH, "stage": "aligner", "reason": "x"})
    assert refused["verdict"] == "no_highlight" and refused["reasons"] == ["G1"]


def test_gate_surah_rejects_a_missing_or_foreign_document():
    with pytest.raises(w2q_gate.GateInputError):
        w2q_gate.gate_surah(SURAH, comp(), doc=None, refusal=None, ayahs={}, wav=None, transcribe_clips=None)
    doc = {"audio": {"sha256": TR.sha("another"), "duration_ms": 1000}, "words": [], "anchors": {}}
    with pytest.raises(w2q_gate.GateInputError):
        w2q_gate.gate_surah(SURAH, comp(), doc=doc, refusal=None, ayahs={}, wav=None, transcribe_clips=None)


def test_main_writes_a_record_for_every_surah_and_the_available_list(tmp_path):
    out = tmp_path / "gate"
    comps, refused = tmp_path / "completeness", tmp_path / "refused"
    comps.mkdir()
    refused.mkdir()
    records = {7: comp("incomplete-start"), 8: comp(), 9: comp()}
    for s, rec in records.items():
        rec = dict(rec, surah=s, file=f"{s:03d}.mp3")
        (comps / f"{s:03d}.json").write_text(json.dumps(rec), encoding="utf-8")
    (refused / "008.json").write_text(json.dumps({"schema": 1, "surah": 8, "stage": "anchors", "reason": "x"}))
    # surah 9 is complete and not refused, but has no aligned document: a tool error
    code = w2q_gate.main(["--reciter", "3", "--surah", "7", "8", "--audio-dir", str(tmp_path), "--aligned-dir",
                          str(tmp_path / "aligned"), "--completeness-dir", str(comps), "--refused-dir", str(refused),
                          "--asr-dir", str(tmp_path / "asr"), "--out-dir", str(out)])
    assert code == 0
    assert json.loads((out / "007.json").read_text())["verdict"] == "unavailable"
    assert json.loads((out / "008.json").read_text())["verdict"] == "no_highlight"
    assert json.loads((out / "available-surahs.json").read_text()) == [8]  # no_highlight still uploads
    code = w2q_gate.main(["--reciter", "3", "--surah", "9", "--audio-dir", str(tmp_path), "--aligned-dir",
                          str(tmp_path / "aligned"), "--completeness-dir", str(comps), "--refused-dir", str(refused),
                          "--asr-dir", str(tmp_path / "asr"), "--out-dir", str(tmp_path / "gate2")])
    assert code == 2


# --- the records in the reciter report ----------------------------------------------------------------------------

def test_every_record_kind_validates_and_merges_into_the_report(tmp_path):
    """G0, G1, a middle gap, needs-repair and a pass, merged and rendered as the workflow does."""
    ayahs = [1, 2, 3, 4, 5]
    files = {str(s): f"{s:03d}.mp3" for s in ayahs}
    base = tmp_path / "handoff"
    for sub in ("completeness", "gate", "refused"):
        (base / sub).mkdir(parents=True)
    words = make_words()
    gap_anchors = anchors_for(words, pace_breaks=[JUMP])
    plan = {
        1: ("incomplete-end", None),
        2: ("complete", "refused"),
        3: ("complete", ("gap", gap_anchors, ok_results(bad={9, 10, 11}))),
        4: ("complete", ("repair", anchors_for(words), ok_results(bad={5}))),
        5: ("complete", ("pass", anchors_for(words), ok_results())),
    }
    for s, (cv, how) in plan.items():
        c = TR.completeness(s, ayah_count=30, verdict=cv, stored=False)
        c["tool_version"] = tool_version()
        (base / "completeness" / f"{s:03d}.json").write_text(json.dumps(c), encoding="utf-8")
        if cv != "complete":
            rec = surah_verdict(s, c)
        elif how == "refused":
            rec = surah_verdict(s, c, refusal={"schema": 1, "surah": s, "stage": "anchors", "reason": "x"})
        else:
            _, anchors, res = how
            rec = surah_verdict(s, c, words=make_words(surah=s), anchors=anchors, g2=good_g2(),
                                g3={"results": res, "unprobed": [], "moved": {}})
        R.validate_gate(rec)
        (base / "gate" / f"{s:03d}.json").write_text(json.dumps(rec), encoding="utf-8")
    report = R.merge_reciter_report(base, {"reciter_id": 3, "files": files}, "run-1")
    got = {k: (v["verdict"], v["reason"]) for k, v in report["surahs"].items()}
    assert got == {"1": ("unavailable", "incomplete-end"), "2": ("no_highlight", "G1"),
                   "3": ("unavailable", "incomplete-middle"), "4": ("no_highlight", "needs-repair"),
                   "5": ("pass", None)}
    assert report["surahs"]["3"]["reason"] in R.EXCLUDED_REASONS  # what `way2quran-exclude` accepts
    assert report["release"]["unavailable"] == 2 and "pending" not in report["release"]
    R.validate_reciter_report(report)
    assert "incomplete-middle" in R.pr_markdown(report)


def test_an_unavailable_gate_record_needs_exactly_one_excluded_reason():
    rec = surah_verdict(SURAH, comp("incomplete-end"))
    R.validate_gate(rec)
    for reasons in ([], ["incomplete-middle", "needs-repair"], ["needs-repair"]):
        with pytest.raises(ValueError):
            R.validate_gate(dict(rec, reasons=reasons))


def test_no_record_holds_arabic_text():
    rec = valid(verdict(g3_results=ok_results(bad={12})))
    text = json.dumps(rec, ensure_ascii=False)
    assert not any("؀" <= ch <= "ۿ" for ch in text)
    assert norm("ab") == ""  # the placeholder letters are the only Arabic in this module


# --- the workflow wiring ------------------------------------------------------------------------------------------

def test_stage_hands_on_no_aligned_document_for_a_surah_the_gate_found_unavailable(tmp_path):
    stage_mod = load_script("w2q_stage")
    ingest, align = tmp_path / "ingest", tmp_path / "align"
    ingest.mkdir()
    (ingest / "dry-manifest-3-1.json").write_text("{}", encoding="utf-8")
    for sub in ("aligned", "gate"):
        (align / sub).mkdir(parents=True)
    for s, verdict_name in ((1, "pass"), (2, "unavailable"), (3, "no_highlight")):
        (align / "aligned" / f"{s:03d}.json").write_text("{}", encoding="utf-8")
        (align / "gate" / f"{s:03d}.json").write_text(json.dumps({"verdict": verdict_name}), encoding="utf-8")
    (align / "gate" / "available-surahs.json").write_text("[1, 3]", encoding="utf-8")
    handoff = tmp_path / "handoff"
    stage_mod.stage(3, 1, [1, 2, 3], ingest, align, handoff)
    assert sorted(p.name for p in (handoff / "aligned").iterdir()) == ["001.json", "003.json"]
    assert sorted(p.name for p in (handoff / "gate").iterdir()) == ["001.json", "002.json", "003.json"]


# --- repair (plan way2quran-quality Q7b) ----------------------------------------------------------------------------
#
# A synthetic recitation: PLACEHOLDER words of distinct random Arabic letters, one CTC token per letter, certain on
# its frames. The fake transcriber hears, for any clip, the recited words whose onset falls inside it, so G3, the
# stepped probes and the dense ASR all read the same true timeline. The first-pass words are built from it with the
# distortion of each case (an ayah start placed on a repeat, a late start, ...).

import random as _random  # noqa: E402

import torch  # noqa: E402

from recitation_align import repeats as RP  # noqa: E402

SPF = 0.02  # seconds per emission frame
LETTERS_W = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي"  # PLACEHOLDER letters
VOCAB = {ch: i + 1 for i, ch in enumerate(LETTERS_W)}


def world_ayahs(n_ayahs=8, per=10, seed=11):
    rng, seen, out = _random.Random(seed), set(), {}
    for a in range(1, n_ayahs + 1):
        ws = []
        while len(ws) < per:
            w = "".join(rng.choice(LETTERS_W) for _ in range(4))
            if w not in seen:
                seen.add(w)
                ws.append(w)
        out[(SURAH, a)] = " ".join(ws)
    out[(1, 1)] = "صصصص"  # PLACEHOLDER first ayah of the text: the surah does not open with it (no basmala words)
    return out


class World:
    """A recited order [(ayah, position)] laid out on frames: 5 frames per letter, 2 blank frames after a word,
    25 blank frames (0.5 s) where `breaks` says a pause follows (ayah ends by default)."""

    def __init__(self, ayahs, order, breaks=None):
        self.ayahs = ayahs
        frames = [0] * 50
        self.occ = []  # (ayah, position, word, onset_ms, end_ms)
        for k, (a, p) in enumerate(order):
            word = ayahs[(SURAH, a)].split()[p - 1]
            onset = len(frames)
            for ch in word:
                frames += [VOCAB[ch]] * 5
            end = len(frames)
            frames += [0] * 2
            nxt = order[k + 1] if k + 1 < len(order) else None
            pause = nxt is None or nxt[0] != a or (breaks is not None and k in breaks)
            if pause:
                frames += [0] * 25
            self.occ.append((a, p, word, round(onset * SPF * 1000), round(end * SPF * 1000)))
        frames += [0] * 150
        self.em = torch.full((len(frames), len(VOCAB) + 1), -12.0)
        for f, t in enumerate(frames):
            self.em[f, t] = 0.0
        self.wav = np.zeros(len(frames) * 320, dtype=np.float32)
        self.duration_ms = round(len(frames) * SPF * 1000)
        self.garble = set()

    def first(self, a, p, k=0):
        """The k-th occurrence of (a, p)."""
        return [o for o in self.occ if o[0] == a and o[1] == p][k]

    def __call__(self, wav, clips, batch=1):
        out = []
        for s, e in clips:
            heard = [o for o in self.occ if s * 1000 - 50 <= o[3] < e * 1000 - 150]
            text = " ".join(o[2] for o in heard)
            if heard and (heard[0][0], heard[0][1]) in self.garble:
                text = "غغغغ ظظظظ"  # PLACEHOLDER noise
            out.append({"start_s": s, "end_s": e, "text": text})
        return {"clips": out, "seconds": 0.0}

    def dense(self, windows):
        return [c["text"] for c in self(None, windows)["clips"]]

    def tools(self, samples):
        return {"em": self.em, "vocab": VOCAB, "blank": 0, "dense": self.dense}


def plain_words(world, *, override=None):
    """First-pass words: each (ayah, position) at its first occurrence, with `override` {(a, p): (start, end)}."""
    out = []
    for a, p, word, onset, end in world.occ:
        if any(w["ayah"] == a and w["position"] == p for w in out):
            continue
        s, e = (override or {}).get((a, p), (onset, end))
        out.append({"surah": SURAH, "ayah": a, "position": p, "word": word, "start_ms": s, "end_ms": e,
                    "confidence": 0.9})
    return sorted(out, key=lambda w: (w["ayah"], w["position"]))


def order_of(ayahs, *spans):
    """The recited order: every ayah in turn, with `spans` [(after (a, p), [(a, p), ...])] inserted."""
    order = [(a, p) for (s, a) in sorted(ayahs) if s == SURAH for p in range(1, len(ayahs[(s, a)].split()) + 1)]
    for after, extra in spans:
        k = order.index(after) + 1
        order[k:k] = extra
    return order


def gate_world(world, words, *, n_ayahs, doc_extra=None):
    doc = {"audio": {"sha256": SHA, "duration_ms": world.duration_ms}, "words": words, "ayahs": [],
           "anchors": {"cuts": [], "pace_breaks": [], "held_out": [], "held_out_refs": []}, **(doc_extra or {})}
    c = comp(ayah_count=n_ayahs)
    rec = w2q_gate.gate_surah(SURAH, c, doc=doc, refusal=None, ayahs=world.ayahs, wav=world.wav,
                              transcribe_clips=world, repair=world.tools)
    return valid(rec), doc


@pytest.fixture
def positions(monkeypatch):
    """Repeats written as repeated positions (REPEAT_MODE "positions"), whatever the frozen default is."""
    monkeypatch.setitem(PARAMS, "REPEAT_MODE", "positions")


def repeat_of_tail_world(n_ayahs=8):
    """The 5:85 pattern: the last four words of ayah 4 are recited again before ayah 5."""
    ayahs = world_ayahs(n_ayahs)
    world = World(ayahs, order_of(ayahs, ((4, 10), [(4, p) for p in range(7, 11)])))
    rep = world.first(4, 7, 1)
    true5 = world.first(5, 1)
    words = plain_words(world, override={(5, 1): (rep[3], true5[4])})  # ayah 5 starts on the repeat
    return world, words, true5


def test_the_5_85_pattern_a_start_inside_a_repeat_of_the_previous_tail_is_repaired(positions):
    world, words, true5 = repeat_of_tail_world()
    rec, doc = gate_world(world, words, n_ayahs=8)
    assert rec["verdict"] == "repaired" and rec["reasons"] == []
    assert rec["checks"]["G3"]["failed"] == [] and "repair" in rec["seconds"]
    (rep,) = rec["repairs"]
    assert rep["accepted"] and rep["kind"] == "within-ayah" and rep["region"] == [f"{SURAH}:4", f"{SURAH}:6"]
    assert rep["ctc_margin"] > PARAMS["CTC_MARGIN"] and [j[:2] for j in rep["jumps"]] == [["4:10", "4:7"]]
    assert rep["jumps"][0][3] is True
    assert abs(rep["after_start_ms"] - true5[3]) <= 20 and rep["before_start_ms"] < true5[3] - 1000
    four = [w for w in doc["words"] if w["ayah"] == 4]
    assert [(w["position"], w["occurrence"]) for w in four] == [(p, 1) for p in range(1, 11)] + [
        (p, 2) for p in range(7, 11)]
    assert doc["words"] == sorted(doc["words"], key=lambda w: (w["ayah"], w["start_ms"]))
    assert doc["repairs"] == rec["repairs"] and doc["ayahs"][4]["start_ms"] == rep["after_start_ms"]
    assert rec["segments_null"] == [] and rec["cross_ayah"] == []


def test_the_5_31_pattern_a_whole_ayah_recited_twice_is_repaired(positions):
    ayahs = world_ayahs()
    world = World(ayahs, order_of(ayahs, ((4, 10), [(4, p) for p in range(1, 11)])))
    true5 = world.first(5, 1)
    words = plain_words(world, override={(5, 1): (world.first(4, 1, 1)[3], true5[4])})
    rec, doc = gate_world(world, words, n_ayahs=8)
    assert rec["verdict"] == "repaired"
    (rep,) = rec["repairs"]
    assert rep["kind"] == "within-ayah" and [j[:2] for j in rep["jumps"]] == [["4:10", "4:1"]]
    assert abs(rep["after_start_ms"] - true5[3]) <= 20
    assert sum(w["ayah"] == 4 for w in doc["words"]) == 20


def test_gating_a_repaired_document_again_carries_its_repairs_and_does_not_repair_again(positions):
    world, words, _ = repeat_of_tail_world()
    rec, doc = gate_world(world, words, n_ayahs=8)
    words_after = [dict(w) for w in doc["words"]]
    again = valid(w2q_gate.gate_surah(SURAH, comp(ayah_count=8), doc=doc, refusal=None, ayahs=world.ayahs,
                                      wav=world.wav, transcribe_clips=world,
                                      repair=lambda s: pytest.fail("no second repair")))
    assert again["verdict"] == "repaired" and again["repairs"] == rec["repairs"] and "repair" not in again["seconds"]
    assert doc["words"] == words_after


def test_a_late_start_that_is_not_a_repeat_is_fixed_by_the_stepped_probe(positions):
    ayahs = world_ayahs()
    world = World(ayahs, order_of(ayahs))
    w51, w53 = world.first(5, 1), world.first(5, 3)
    words = plain_words(world, override={(4, 10): (world.first(4, 10)[3], w53[3] - 200),  # 4:10 runs over 5:1-5:2
                                         (5, 1): (w53[3] - 200, w53[3] - 100), (5, 2): (w53[3] - 100, w53[3])})
    rec, doc = gate_world(world, words, n_ayahs=8)
    assert rec["verdict"] == "repaired"
    (rep,) = rec["repairs"]
    assert rep["kind"] == "start" and rep["steps"] >= 1 and rep["ctc_margin"] is None
    assert abs(rep["after_start_ms"] - w51[3]) <= 20
    assert not any("occurrence" in w for w in doc["words"])


def test_a_repair_whose_region_still_fails_gives_no_highlight(positions):
    ayahs = world_ayahs()
    world = World(ayahs, order_of(ayahs))
    world.garble.add((5, 1))  # every clip that begins on 5:1 is heard as noise: nothing can confirm the start
    rec, doc = gate_world(world, plain_words(world), n_ayahs=8)
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["repair-failed"]
    (rep,) = rec["repairs"]
    assert rep["accepted"] is False and rep["failed"]
    assert "repairs" not in doc  # the document is rewritten only when repaired


def test_a_cross_ayah_jump_gives_segments_null_with_the_continuing_pass_start(positions):
    ayahs = world_ayahs()
    order = order_of(ayahs, ((4, 10), [(5, 1), (5, 2), (5, 3), (4, 7), (4, 8), (4, 9), (4, 10)]))
    back = order.index((5, 1)) + 6  # the second 4:10: a pause before 5 begins again
    world = World(ayahs, order, breaks={back})
    cont = world.first(5, 1, 1)
    words = plain_words(world, override={(5, 1): (world.first(5, 1)[3], cont[4]), (5, 2): world.first(5, 2, 1)[3:],
                                         (5, 3): world.first(5, 3, 1)[3:]})
    ctx = gate.RepairContext(surah=SURAH, ayahs=ayahs, wav=world.wav, em=world.em, vocab=VOCAB, blank=0, spf=SPF,
                             transcribe_clips=world, dense=world.dense, completeness=comp(ayah_count=8),
                             duration_s=world.duration_ms / 1000, usable=set(range(1, 9)))
    region = RP.Region(4, 6, ["G3"], [5], world.first(4, 1)[3], world.first(7, 1)[3])
    raw = {5: {"verdict": BAD, "heard": "4:3", "score": 90.0}}
    r = gate.repair_region(ctx, region, words, raw)
    assert r["entry"]["accepted"] and r["entry"]["kind"] == "cross-ayah", r["entry"]
    assert r["null"] == [4, 5] and r["cross"] == [{"from": f"{SURAH}:4", "to": f"{SURAH}:5", "represented": False}]
    five = [w for w in r["words"] if w["ayah"] == 5]
    assert abs(min(w["start_ms"] for w in five) - cont[3]) <= 20
    rec = valid(verdict(make_words(), repairs=[r["entry"]], repair_null=r["null"], cross_ayah=r["cross"]))
    assert rec["verdict"] == "repaired" and rec["segments_null"] == [4, 5] and rec["cross_ayah"] == r["cross"]
    report = {"surahs": {"7": {"verdict": "repaired", "gate": rec}}}
    assert sum(1 for e in report["surahs"].values() for c in e["gate"]["cross_ayah"] if not c["represented"]) == 1


def test_repeat_mode_null_writes_the_repeated_ayahs_without_segments(monkeypatch):
    monkeypatch.setitem(PARAMS, "REPEAT_MODE", "null")
    world, words, true5 = repeat_of_tail_world(n_ayahs=40)
    rec, doc = gate_world(world, words, n_ayahs=40)
    assert rec["verdict"] == "repaired" and rec["segments_null"] == [4]  # the ayah that holds the repeat
    assert abs(rec["repairs"][0]["after_start_ms"] - true5[3]) <= 20  # the ayah start is still repaired


def test_after_repair_three_consecutive_g3_failures_are_unavailable_and_two_are_repair_failed():
    attempt = [{"region": ["7:8", "7:12"], "accepted": False}]
    rec = valid(verdict(g3_results=ok_results(bad={9, 10}, unsure={11}), repairs=attempt))
    assert rec["verdict"] == "unavailable" and rec["reasons"] == ["incomplete-middle"]
    rec = valid(verdict(g3_results=ok_results(bad={9, 11}), repairs=attempt))
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["repair-failed"]
    assert rec["repairs"] == attempt
    assert valid(verdict(repairs=[]))["verdict"] == "pass"  # nothing accepted, nothing failing


def test_the_repair_stage_never_loads_emissions_for_a_surah_that_passes():
    ayahs = world_ayahs()
    world = World(ayahs, order_of(ayahs))
    doc = {"audio": {"sha256": SHA, "duration_ms": world.duration_ms}, "words": plain_words(world),
           "anchors": {"cuts": [], "pace_breaks": [], "held_out": [], "held_out_refs": []}}
    rec = w2q_gate.gate_surah(SURAH, comp(ayah_count=8), doc=doc, refusal=None, ayahs=ayahs, wav=world.wav,
                              transcribe_clips=world, repair=lambda s: pytest.fail("emissions must not load"))
    assert valid(rec)["verdict"] == "pass" and set(rec["seconds"]) == {"g3", "g4", "g2"}
    assert rec["repairs"] == [] and rec["cross_ayah"] == []


def test_g5_compares_a_repeated_position_with_its_nearest_occurrence():
    words = make_words()
    w = next(x for x in words if x["ayah"] == 3 and x["position"] == 2)
    again = dict(w, start_ms=w["start_ms"] + 5000, end_ms=w["end_ms"] + 5000, occurrence=2)
    refs = [[3, 2, w["start_ms"] + 5000, w["start_ms"]]] + refs_for(words)
    g5 = held_out_stats({"held_out_refs": refs}, words + [again])
    assert g5["share_300ms"] == 1.0


def test_dense_asr_is_cached_under_its_own_key_and_keeps_the_windows(tmp_path):
    from recitation_align.transcribe import transcription_key_at

    path = tmp_path / "asr" / "007.json"
    path.parent.mkdir()
    path.write_text(json.dumps({"key": transcription_key_at(SHA), "windows": {"0-30000": "x"}}), encoding="utf-8")
    calls = []

    def fake(wav, clips, batch=1):
        calls.append(list(clips))
        return {"clips": [{"start_s": s, "end_s": e, "text": f"t{s}"} for s, e in clips], "seconds": 0.0}

    run = w2q_gate.dense_asr(None, SHA, path, fake)
    assert run([(1.0, 11.0), (6.0, 16.0)]) == ["t1.0", "t6.0"]
    assert run([(1.0, 11.0)]) == ["t1.0"] and len(calls) == 1
    body = json.loads(path.read_text(encoding="utf-8"))
    assert body["windows"] == {"0-30000": "x"} and body["dense"] == {"1000-11000": "t1.0", "6000-16000": "t6.0"}


def test_start_direction_follows_what_the_failed_probe_heard():
    d = gate.start_direction
    assert d({"heard": "4:9"}, 5) == 1  # the previous ayah: the start is early
    assert d({"heard": "5:2"}, 5) == -1 and d({"heard": "6:0"}, 5) == -1  # past the opening: late
    assert d({"heard": "5:0"}, 5) == 0 and d({"heard": None}, 5) == 0 and d(None, 5) == 0
    assert gate._steps(1)[:2] == [0.5, 1.0] and gate._steps(0)[:4] == [-0.5, 0.5, -1.0, 1.0]
    assert max(abs(x) for x in gate._steps(0)) == gate.STEP_MAX_S


def test_a_mistimed_last_word_is_fixed_by_the_end_repair(positions):
    ayahs = world_ayahs()
    world = World(ayahs, order_of(ayahs))
    last = world.first(8, 10)
    late = last[3] + 500  # the last word placed late: its clip hears nothing, the word before it runs on
    words = plain_words(world, override={(8, 9): (world.first(8, 9)[3], late), (8, 10): (late, last[4] + 600)})
    rec, doc = gate_world(world, words, n_ayahs=8)
    assert rec["verdict"] == "repaired" and rec["checks"]["G2"]["status"] == "pass"
    (rep,) = rec["repairs"]
    assert rep["trigger"] == ["G2"] and rep["kind"] == "start" and rep["region"] == [f"{SURAH}:7", f"{SURAH}:8"]
    fixed = next(w for w in doc["words"] if w["ayah"] == 8 and w["position"] == 10)
    assert abs(fixed["start_ms"] - last[3]) <= 20


def test_a_merged_region_that_fails_is_repaired_ayah_by_ayah(positions):
    """Two neighbouring failures merge into one region; one cannot be fixed (its start is heard as noise). The
    repeat before the other is still repaired on its own, and the surah stays no_highlight for the one left."""
    world, words, true5 = repeat_of_tail_world()
    world.garble.add((6, 1))
    rec, doc = gate_world(world, words, n_ayahs=8)
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["repair-failed"]
    merged, *subs = rec["repairs"]
    assert merged["region"] == [f"{SURAH}:4", f"{SURAH}:7"] and merged["accepted"] is False
    fixed = [r for r in subs if r["accepted"]]
    assert [r["region"] for r in fixed] == [[f"{SURAH}:4", f"{SURAH}:6"]]
    assert abs(fixed[0]["after_start_ms"] - true5[3]) <= 20
    assert rec["checks"]["G3"]["failed"] == [6]
    assert "repairs" not in doc


def test_split_gives_one_region_per_focus_with_its_own_triggers():
    r = RP.Region(3, 8, ["G3", "step-back", "stretch"], [4, 7], why={4: ["G3"], 7: ["step-back"]})
    words = [{"surah": SURAH, "ayah": a, "position": 1, "word": "بتثج", "start_ms": a * 1000, "end_ms": a * 1000 + 500,
              "confidence": 0.9} for a in range(1, 11)]
    subs = RP.split(r, words)
    assert [(s.lo, s.hi, s.focus, s.triggers) for s in subs] == [(3, 5, [4], ["G3"]), (6, 8, [7], ["step-back"])]
    assert subs[0].failing and not subs[1].failing
    assert (subs[0].start_ms, subs[0].end_ms) == (3000, 6000)


def test_a_failing_neighbour_may_move_inside_the_next_ayahs_repair_and_must_then_pass(positions):
    """Ayahs 4 and 5 both start late; 6 cannot be fixed, so the merged region 3-7 fails as a whole. Repairing 4 on
    its own re-aligns 5 too: 5 failed before, so it may move, and it passes G3 at its new start. The sub-region of 5
    is then skipped, because 5 no longer fails."""
    ayahs = world_ayahs()
    world = World(ayahs, order_of(ayahs))
    world.garble.add((6, 1))
    over = {}
    for a in (4, 5):
        w3 = world.first(a, 3)[3]
        over[(a - 1, 10)] = (world.first(a - 1, 10)[3], w3 - 200)  # the last word before runs over the opening
        over[(a, 1)], over[(a, 2)] = (w3 - 200, w3 - 100), (w3 - 100, w3)
    rec, doc = gate_world(world, plain_words(world, override=over), n_ayahs=8)
    assert rec["verdict"] == "no_highlight" and rec["checks"]["G3"]["failed"] == [6]
    regions = [(r["region"], r["accepted"]) for r in rec["repairs"]]
    assert regions[0] == ([f"{SURAH}:3", f"{SURAH}:7"], False)
    assert ([f"{SURAH}:3", f"{SURAH}:5"], True) in regions
    assert not any(r == [f"{SURAH}:4", f"{SURAH}:6"] for r, _ in regions)  # 5 was fixed already: not retried
    fixed = next(r for r in rec["repairs"] if r["accepted"])
    assert abs(fixed["starts"]["5"][1] - world.first(5, 1)[3]) <= 20 and abs(fixed["starts"]["4"][1] - world.first(4, 1)[3]) <= 20

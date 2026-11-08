"""The repeat calibration's metrics (plan way2quran-quality Q7c), on synthetic references: positions and times only,
no QF data, no model."""

import importlib.util
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("repeat_calibration", TOOL / "scripts" / "repeat_calibration.py")
rc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rc)


def ref(positions, step=500):
    return [{"index": p, "start_ms": i * step, "end_ms": i * step + 400} for i, p in enumerate(positions)]


def segs(positions, step=500, shift=0):
    return [[p, i * step + shift, i * step + 400 + shift] for i, p in enumerate(positions)]


QF_REPEAT = [1, 2, 3, 4, 3, 4, 5]  # 3-4 recited twice: two repeat occurrences


def test_a_repeat_reproduced_exactly_counts_every_occurrence_and_its_error():
    r = rc.compare(segs(QF_REPEAT, shift=40), ref(QF_REPEAT))
    assert r["repeat_occurrences"] == 2 and r["reproduced"] == 2 and r["exact"] and r["our_repeat"]
    assert r["errors"] == [40, 40]


def test_a_plain_alignment_reproduces_no_repeat_occurrence():
    r = rc.compare(segs([1, 2, 3, 4, 5]), ref(QF_REPEAT))
    assert r["repeat_occurrences"] == 2 and r["reproduced"] == 0 and not r["exact"] and not r["our_repeat"]


def test_a_shorter_repeat_than_qf_reproduces_part_of_it():
    r = rc.compare(segs([1, 2, 3, 4, 4, 5]), ref(QF_REPEAT))
    assert r["reproduced"] == 1 and not r["exact"]


def test_a_repeat_on_a_control_ayah_is_a_false_repeat():
    clean = rc.compare(segs([1, 2, 3]), ref([1, 2, 3]))
    false = rc.compare(segs([1, 2, 2, 3]), ref([1, 2, 3]))
    assert not clean["our_repeat"] and false["our_repeat"]
    s = rc.summarise([rc.compare(segs(QF_REPEAT), ref(QF_REPEAT))], [clean, false])
    assert s["false_repeats"] == 1 and s["passed"] is False


def test_the_summary_and_the_targets():
    good = [rc.compare(segs(QF_REPEAT, shift=20), ref(QF_REPEAT)) for _ in range(9)]
    miss = [rc.compare(segs([1, 2, 3, 4, 5]), ref(QF_REPEAT))]
    clean = [rc.compare(segs([1, 2, 3]), ref([1, 2, 3]))]
    s = rc.summarise(good + miss, clean)
    assert s["repeat_ayahs"] == 10 and s["repeat_occurrences"] == 20 and s["reproduced_share"] == 0.9
    assert s["median_ms"] == 20 and s["p90_ms"] == 20 and s["false_repeats"] == 0 and s["passed"] is True
    late = [rc.compare(segs(QF_REPEAT, shift=200), ref(QF_REPEAT)) for _ in range(10)]
    assert rc.summarise(late, clean)["passed"] is False  # p90 above 150 ms


def test_best_prefers_a_passing_setting_then_the_fewest_false_repeats():
    a = {"passed": False, "false_repeats": 0, "reproduced_share": 0.5, "p90_ms": 100}
    b = {"passed": True, "false_repeats": 0, "reproduced_share": 0.92, "p90_ms": 120}
    c = {"passed": False, "false_repeats": 3, "reproduced_share": 0.99, "p90_ms": 50}
    assert rc.best([a, b, c]) is b
    assert rc.best([a, c]) is a


def test_is_repeat():
    assert rc.is_repeat(ref(QF_REPEAT)) and not rc.is_repeat(ref([1, 2, 3]))


def _cell(kinds, reproduced, false_repeat=False):
    repeat = [{"repeat_occurrences": 1, "reproduced": r, "errors": [50] * r, "all_errors": [50], "exact": bool(r),
               "our_repeat": bool(r)} for r in reproduced]
    control = [{"repeat_occurrences": 0, "reproduced": 0, "errors": [], "all_errors": [10], "exact": True,
                "our_repeat": false_repeat}]
    return {"repeat": repeat, "control": control, "kinds": kinds, "lit": {"control": [8, 10]}}


def test_merge_pools_the_surah_jobs_into_one_record_judged_on_back_jumps(tmp_path):
    import json

    from recitation_align.quality import PARAMS

    key = json.dumps([PARAMS["VITERBI_PENALTY"], "total"])
    a, b = tmp_path / "a.json", tmp_path / "b.json"
    a.write_text(json.dumps({"surahs": [1], "cells": {key: _cell(["back-jump"] * 9, [1] * 9)}}))
    b.write_text(json.dumps({"surahs": [18], "cells": {key: _cell(["back-jump", "same-word-only"], [1, 0])}}))
    out = tmp_path / "record.json"
    assert rc.main(["--merge", str(a), str(b), "--out", str(out), "--record"]) == 0
    rec = json.loads(out.read_text())["records"][-1]
    assert rec["surahs"] == [1, 18] and rec["confirm"] == "total"
    assert rec["back_jump"]["reproduced_share"] == 1.0 and rec["back_jump"]["false_repeats"] == 0
    assert "passed" not in rec["back_jump"] and rec["passed"] is True  # timing reported, not gated
    assert rec["same_word_only"]["ayahs"] == 1 and rec["lit_agree"] == {"control": 0.8}


def test_one_false_repeat_fails_the_merged_record(tmp_path):
    import json

    from recitation_align.quality import PARAMS

    key = json.dumps([PARAMS["VITERBI_PENALTY"], "total"])
    a = tmp_path / "a.json"
    a.write_text(json.dumps({"surahs": [36], "cells": {key: _cell(["back-jump"], [1], false_repeat=True)}}))
    out = tmp_path / "record.json"
    rc.main(["--merge", str(a), "--out", str(out), "--record"])
    assert json.loads(out.read_text())["records"][-1]["passed"] is False

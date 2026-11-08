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

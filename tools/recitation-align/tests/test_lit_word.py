"""lit_word.py: the app's lit-word rule and the Q7f/Q7h metrics, on synthetic timings (positions and times only)."""

import importlib.util
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("lit_word", TOOL / "scripts" / "lit_word.py")
lw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lw)


def ref(ayah, positions, t0=0, step=500):
    words = [{"index": p, "start_ms": t0 + i * step, "end_ms": t0 + i * step + 400} for i, p in enumerate(positions)]
    return {"ayah": ayah, "start_ms": t0, "end_ms": t0 + len(positions) * step, "words": words}


def row(ayah, positions, t0=0, step=500, shift=0, surah=9):
    segs = [[p, t0 + i * step + shift, t0 + i * step + 400 + shift] for i, p in enumerate(positions)]
    return {"verse_key": f"{surah}:{ayah}", "start_ms": t0, "end_ms": t0 + len(positions) * step, "segments": segs}


def test_the_latest_started_word_is_lit_and_a_later_segment_wins_a_tie():
    segs = [[1, 0, 400], [2, 500, 900], [3, 500, 900]]
    assert lw.active_word(segs, 0, 1000, 450) == 1
    assert lw.active_word(segs, 0, 1000, 600) == 3
    assert lw.active_word(segs, 0, 1000, 5000) == 3  # clamped into the ayah
    assert lw.active_word(None, 0, 1000, 10) is None


def test_a_shift_moves_our_starts_earlier():
    segs = [[1, 0, 400], [2, 500, 900]]
    assert lw.active_word(segs, 0, 1000, 450) == 1
    assert lw.active_word(segs, 0, 1000, 450, shift_ms=-80) == 2


def test_identical_timings_agree_everywhere():
    refs = [ref(1, [1, 2, 3]), ref(2, [1, 2, 1, 2], t0=1500)]
    rows = [row(1, [1, 2, 3]), row(2, [1, 2, 1, 2], t0=1500)]
    out = lw.split(rows, refs, 9)
    assert out["plain"] == [0, 75, 0] and out["repeat"] == [0, 100, 0]
    assert lw.agreement(rows[1]["segments"], refs[1]) == (100, 100)


def test_late_starts_are_wrong_time_and_null_segments_are_nulled():
    refs = [ref(1, [1, 2, 3]), ref(2, [1, 2], t0=1500)]
    rows = [row(1, [1, 2, 3], shift=100), dict(row(2, [1, 2], t0=1500), segments=None)]
    out = lw.split(rows, refs, 9)
    assert out["plain"] == [50, 60, 15]  # 3 words 100 ms late: 5 samples wrong each; ayah 2 nulled
    assert lw.split(rows, refs, 9, shift_ms=-100)["plain"] == [50, 75, 0]
    assert lw.split(None, refs, 9)["plain"] == [125, 0, 0]  # nothing shipped


def test_another_ayah_current_is_wrong():
    refs = [ref(1, [1, 2], t0=0)]
    rows = [{"verse_key": "9:2", "start_ms": 0, "end_ms": 1000, "segments": [[1, 0, 900]]}]
    assert lw.split(rows, refs, 9)["plain"] == [0, 0, 50]


def test_start_errors_use_control_ayahs_only_and_stats_are_signed():
    refs = [ref(1, [1, 2, 3]), ref(2, [1, 2, 1], t0=1500), ref(3, [1, 2], t0=3000)]
    rows = [row(1, [1, 2, 3], shift=120), row(2, [1, 2], t0=1500), row(3, [1], t0=3000)]
    errors = lw.start_errors(rows, refs, 9)
    assert errors == [120, 120, 120]  # ayah 2 is a QF repeat, ayah 3 does not match one to one
    s = lw.stats([-60, 0, 20, 40, 100])
    assert s["n"] == 5 and s["median"] == 20 and s["early_gt50"] == 0.2 and lw.stats([]) is None


def test_word_start_sweeps_zero_and_every_shift():
    refs, rows = [ref(1, [1, 2, 3])], [row(1, [1, 2, 3], shift=100)]
    res = lw.word_start(rows, refs, 9)
    assert list(res["lit"]) == ["0", "-120", "-110", "-100", "-90", "-80", "-70", "-60"]
    assert res["lit"]["-100"]["plain"][2] == 0 and res["start"]["median"] == 100


def test_word_start_lights_only_the_control_ayahs():
    refs = [ref(1, [1, 2, 3]), ref(2, [1, 2, 1], t0=1500), ref(3, [1, 2], t0=3000)]
    rows = [row(1, [1, 2, 3]), row(2, [1, 2], t0=1500), row(3, [1], t0=3000)]
    assert [r["ayah"] for r in lw.controls(rows, refs, 9)] == [1]
    res = lw.word_start(rows, refs, 9)
    assert res["control_ayahs"] == 1 and res["lit"]["0"]["plain"] == [0, 75, 0] and res["lit"]["0"]["repeat"] == [0, 0, 0]

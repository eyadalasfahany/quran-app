"""Marks JSON: validation, round trip, atomic write, lookups. No model, no network."""

import json
import os

import pytest

from recitation_align import marks as marks_mod
from recitation_align.marks import (empty_marks, load_marks, reviewed_ranges, save_marks, stretch_id,
                                    surah_marks, validate_marks)


def sample():
    return {"253": {"002": {"4": 12345, "5": 15000}, "003": {"1": 0}}, "reviewed": ["002:3-7"]}


def test_round_trip_keeps_every_mark(tmp_path):
    path = tmp_path / "253-marks.json"
    save_marks(path, sample())
    assert load_marks(path) == sample()
    assert json.loads(path.read_text(encoding="utf-8"))["253"]["002"]["4"] == 12345


def test_missing_file_loads_as_empty_marks(tmp_path):
    assert load_marks(tmp_path / "none.json") == empty_marks()


def test_saved_file_is_sorted_and_arabic_safe(tmp_path):
    path = tmp_path / "m.json"
    save_marks(path, {"reviewed": ["002:3-7", "001:1-2"], "253": {"002": {"10": 1, "2": 2}}})
    text = path.read_text(encoding="utf-8")
    assert text.endswith("\n")
    assert json.loads(text)["reviewed"] == ["001:1-2", "002:3-7"]


def test_reviewed_list_is_deduplicated_and_sorted():
    out = validate_marks({"reviewed": ["002:3-7", "002:3-7", "001:1-2"]})
    assert out["reviewed"] == ["001:1-2", "002:3-7"]


@pytest.mark.parametrize("bad", [
    [],
    {"253": {"02": {"1": 0}}},
    {"253": {"002": {"0": 5}}},
    {"253": {"002": {"x": 5}}},
    {"253": {"002": {"1": -1}}},
    {"253": {"002": {"1": 1.5}}},
    {"253": {"002": {"1": True}}},
    {"abc": {"002": {"1": 1}}},
    {"reviewed": ["2:1-2"]},
    {"reviewed": "002:1-2"},
])
def test_invalid_marks_are_refused(bad):
    with pytest.raises(ValueError):
        validate_marks(bad)


def test_failed_write_leaves_the_old_file_and_no_temp_file(tmp_path, monkeypatch):
    path = tmp_path / "253-marks.json"
    save_marks(path, sample())
    before = path.read_bytes()

    def boom(src, dst):
        raise OSError("disk gone")

    monkeypatch.setattr(marks_mod.os, "replace", boom)
    with pytest.raises(OSError):
        save_marks(path, {"253": {"002": {"1": 1}}})
    monkeypatch.undo()
    assert path.read_bytes() == before
    assert sorted(p.name for p in tmp_path.iterdir()) == ["253-marks.json"]


def test_successful_write_leaves_no_temp_file(tmp_path):
    save_marks(tmp_path / "m.json", sample())
    save_marks(tmp_path / "m.json", {"reviewed": []})
    assert sorted(os.listdir(tmp_path)) == ["m.json"]


def test_surah_marks_and_reviewed_ranges():
    data = sample()
    assert surah_marks(data, 2) == {4: 12345, 5: 15000}
    assert surah_marks(data, 9) == {}
    assert reviewed_ranges(data, 2) == [(3, 7)]
    assert reviewed_ranges(data, 3) == []


def test_stretch_id_is_zero_padded():
    assert stretch_id(2, 3, 7) == "002:3-7"

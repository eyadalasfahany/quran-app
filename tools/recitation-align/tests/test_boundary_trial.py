"""boundary_trial.py's pure helpers (no model, no network): the targets, the text reader and the export-style rows."""

import importlib.util
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("boundary_trial", TOOL / "scripts" / "boundary_trial.py")
bt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bt)


def test_targets_put_the_separator_between_words_and_index_each_first_token():
    assert bt.targets([[5, 6], [7], [8, 9, 10]], 1) == ([5, 6, 1, 7, 1, 8, 9, 10], [0, 3, 5])
    assert bt.targets([[5, 6], [7]], None) == ([5, 6, 7], [0, 2])


def test_the_text_file_reader_splits_words():
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write("1|1|ثث خخ\nnot|a line\n36|2|ظظ\n")
    assert bt.load_text(Path(f.name)) == {(1, 1): ["ثث", "خخ"], (36, 2): ["ظظ"]}


def test_rows_end_each_word_at_the_next_start_and_the_last_at_the_ayah_end():
    row = bt.rows_of(36, 2, 1000, 3000, [1000, 1500, 1500])
    assert row == {"verse_key": "36:2", "start_ms": 1000, "end_ms": 3000,
                   "segments": [[1, 1000, 1500], [2, 1500, 1501], [3, 1500, 3000]]}

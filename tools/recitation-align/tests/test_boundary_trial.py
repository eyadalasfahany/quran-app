"""boundary_trial.py's pure helpers (no model, no network): word starts from token frames, and the export-style rows."""

import importlib.util
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("boundary_trial", TOOL / "scripts" / "boundary_trial.py")
bt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bt)


def test_a_word_starts_at_its_first_tokens_frame():
    # three words of 2, 1 and 3 tokens; 20 ms frames; the ayah starts at 1000 ms
    assert bt.word_starts([0, 3, 5, 9, 10, 12], [2, 1, 3], 20.0, 1000) == [1000, 1100, 1180]


def test_rows_end_each_word_at_the_next_start_and_the_last_at_the_ayah_end():
    row = bt.rows_of(36, 2, 1000, 3000, [1000, 1500, 1500])
    assert row == {"verse_key": "36:2", "start_ms": 1000, "end_ms": 3000,
                   "segments": [[1, 1000, 1500], [2, 1500, 1501], [3, 1500, 3000]]}

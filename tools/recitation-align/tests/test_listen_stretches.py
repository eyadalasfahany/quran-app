"""listen_stretches.py without a model: the class of a heard text and the windows. Placeholder letters only."""

import importlib.util
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("listen_stretches", TOOL / "scripts" / "listen_stretches.py")
ls = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ls)

AYAHS = {(9, 1): "ثثث خخ ظظ غغ", (9, 2): "بت ثج حخ دذ", (9, 3): "رز سش صض"}


def test_own_ayah_words_are_own():
    assert ls.classify("خخ ظظ غغ", 9, 1, AYAHS)["class"] == "own"


def test_another_ayahs_words_are_other_and_name_it():
    got = ls.classify("بت ثج حخ", 9, 1, AYAHS)
    assert got["class"] == "other" and got["other"] == {"ayah": 2, "share": 1.0}


def test_words_of_no_ayah_are_unknown_and_nothing_is_silence():
    assert ls.classify("طط عع فف", 9, 1, AYAHS)["class"] == "unknown"
    assert ls.classify("", 9, 1, AYAHS) == {"class": "silence", "own_share": None, "other": None}


def test_windows_cover_the_span_in_pieces_of_at_most_twenty_seconds():
    assert ls.windows(0.0, 10.0) == [(0.0, 10.0)]
    w = ls.windows(5.0, 50.0)
    assert len(w) == 3 and w[0][0] == 5.0 and w[-1][1] == 50.0
    assert all(b - a <= 20.0 for a, b in w)

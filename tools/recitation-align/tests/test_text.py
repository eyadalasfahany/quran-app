"""Normalisation is a matching key only; load_tanzil keeps Tanzil text as-is."""

from recitation_align.text import load_tanzil, norm


def test_norm_strips_tashkeel():
    assert norm("بِسْمِ") == "بسم"


def test_norm_strips_waqf_marks():
    # U+06D6 (small high meem) and U+06DB (small high three dots) are waqf signs; they normalise to nothing.
    assert norm("قَالَ ۖ اللَّهُ ۚ") == "قال الله"


def test_norm_maps_alef_forms_to_bare_alef():
    assert norm("أحمد إبراهيم آدم ٱلله") == "احمد ابراهيم ادم الله"


def test_norm_maps_ya_and_ta_marbuta():
    assert norm("على") == "علي"
    assert norm("مدرسة") == "مدرسه"


def test_norm_maps_hamza_seats():
    assert norm("مؤمن ئ") == "مومن ي"


def test_norm_drops_non_arabic_and_collapses_spaces():
    assert norm("  a  ب  ۝  ج  ") == "ب ج"


def test_load_tanzil_parses_ayah_lines(tmp_path):
    path = tmp_path / "t.txt"
    path.write_text(
        "# header comment\n"
        "1|1|first ayah text\n"
        "1|2|second ayah\n"
        "2|1|fixture\n"
        "3|1|a|b|c\n"
        "not a tanzil line\n"
        "x|1|bad surah\n",
        encoding="utf-8",
    )
    ayahs = load_tanzil(path)
    assert ayahs == {(1, 1): "first ayah text", (1, 2): "second ayah", (2, 1): "fixture"}


def test_load_tanzil_keeps_text_exact(tmp_path):
    path = tmp_path / "t.txt"
    path.write_text("1|1|ab  cd\n", encoding="utf-8")
    assert load_tanzil(path) == {(1, 1): "ab  cd"}

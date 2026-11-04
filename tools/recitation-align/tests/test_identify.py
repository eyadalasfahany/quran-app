"""identify_surah and covered_ayahs on a tiny in-test ayah dict (surahs 112-114, Tanzil text). No model download."""

from recitation_align.identify import covered_ayahs, identify_surah
from recitation_align.text import norm

# Tanzil simple text for surahs 112-114, copied as-is. Quran text is never altered.
AYAHS = {
    (112, 1): "بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ قُلْ هُوَ اللَّهُ أَحَدٌ",
    (112, 2): "اللَّهُ الصَّمَدُ",
    (112, 3): "لَمْ يَلِدْ وَلَمْ يُولَدْ",
    (112, 4): "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
    (113, 1): "بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ",
    (113, 2): "مِن شَرِّ مَا خَلَقَ",
    (113, 3): "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ",
    (113, 4): "وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ",
    (113, 5): "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ",
    (114, 1): "بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
    (114, 2): "مَلِكِ النَّاسِ",
    (114, 3): "إِلَـٰهِ النَّاسِ",
    (114, 4): "مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ",
    (114, 5): "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ",
    (114, 6): "مِنَ الْجِنَّةِ وَالنَّاسِ",
}


def _transcript(surah: int, first: int, last: int) -> str:
    """Unvocalised, un-normalised words as a speech model would return them."""
    return " ".join(AYAHS[(surah, a)] for a in range(first, last + 1))


def test_identify_picks_surah_from_short_snippet():
    surah, score, candidates = identify_surah(_transcript(113, 1, 2), AYAHS)
    assert surah == 113
    assert score >= 90
    assert candidates[0] == {"surah": 113, "score": score}
    assert len(candidates) == 3


def test_identify_picks_other_surah():
    surah, _, _ = identify_surah(_transcript(114, 3, 5), AYAHS)
    assert surah == 114


def test_identify_ignores_vocalisation_and_alef_variants():
    heard = norm(_transcript(112, 1, 2))
    surah, _, _ = identify_surah(heard, AYAHS)
    assert surah == 112


def test_covered_ayahs_lists_only_ayahs_in_transcript():
    covered = covered_ayahs(_transcript(113, 2, 4), AYAHS, 113)
    assert 2 in covered and 3 in covered and 4 in covered
    assert 1 not in covered

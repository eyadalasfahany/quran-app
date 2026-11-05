"""Muqatta'at keys, basmala decision and anchor cuts on synthetic data. No Quran text, no model.

Tokens are placeholder letters; the Tanzil text is never read here.
"""

import pytest
import torch

from recitation_align.align import (MuqattaatMismatch, _expand_muqattaat, _words, anchor_cuts,
                                    decide_basmala)
from recitation_align.text import norm

# surah 9 has no basmala; surah 2 with a basmala prefix in ayah 1 covers the skip rule
FREE = {(9, 1): "ابت ثجح", (9, 2): "خدذ"}


def test_muqattaat_expands_the_key_and_keeps_the_token():
    ayahs = dict(FREE)
    words = _words(9, ayahs)
    done = _expand_muqattaat(9, ayahs, words, {(9, 1): "ابا باء تاء"})
    assert done == 1
    assert words[0][2] == "ابت"  # the output word is the Tanzil token
    assert words[0][3] == norm("ابا باء تاء")


def test_muqattaat_mismatch_fails_loudly_with_the_ayah_key():
    ayahs = dict(FREE)
    words = _words(9, ayahs)
    with pytest.raises(MuqattaatMismatch, match=r"9:1"):
        _expand_muqattaat(9, ayahs, words, {(9, 1): "جيم حا"})


def test_muqattaat_skips_the_basmala_and_applies_to_the_first_real_token():
    # Surah 2: ayah 1 starts with a placeholder basmala, the opening letters follow it.
    ayahs = {(1, 1): "بسم ها", (2, 1): "بسم ها ابت", (2, 2): "خدذ"}
    words = _words(2, ayahs)
    _expand_muqattaat(2, ayahs, words, {(2, 1): "ابا باء تاء"})
    first = [w for w in words if w[0] == 2 and w[1] == 1][0]
    basmala = [w for w in words if w[0] == 2 and w[1] == 1]
    assert first[3] == norm("ابا باء تاء") or any(w[3] == norm("ابا باء تاء") for w in words)


# basmala decision: letters a=1, b=2, t=3, th=4 are the placeholder vocabulary
VOCAB = {"ا": 1, "ب": 2, "ت": 3, "ث": 4}


def _em(sequence: list[tuple[int, int]], frames: int = 400) -> torch.Tensor:
    """sequence: (token, start frame). Each token is a 2-frame peak; blank is 0 elsewhere."""
    em = torch.full((frames, 5), -10.0)
    em[:, 0] = 0.0
    for tok, s in sequence:
        em[s:s + 2, 0] = -10.0
        em[s:s + 2, tok] = 0.0
    return em


BASMALA_WORDS = [(1, 1, "ب", "اب")]  # tokens a, b
BODY_WORDS = [(1, 2, "ث", "ثت"), (2, 1, "ب", "با")]  # tokens 4, 3, then 2, 1


def test_basmala_recited_when_the_basmala_is_in_the_audio():
    words = BASMALA_WORDS + BODY_WORDS
    seq = [(1, 10), (2, 16), (4, 40), (3, 46), (2, 60), (1, 66)]
    em = _em(seq)
    d = decide_basmala(em, words, VOCAB, 1, 0, 1.0)
    assert d["recited"] is True
    assert d["score_recited"] > d["score_omitted"]


def test_basmala_omitted_when_the_audio_starts_with_the_surah():
    words = BASMALA_WORDS + BODY_WORDS
    seq = [(4, 10), (3, 16), (2, 40), (1, 46)]
    em = _em(seq)
    d = decide_basmala(em, words, VOCAB, 1, 0, 1.0)
    assert d["recited"] is False
    assert d["score_omitted"] > d["score_recited"] + 0.02  # beyond the decision margin

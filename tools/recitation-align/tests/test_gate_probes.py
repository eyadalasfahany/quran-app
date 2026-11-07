"""G3 and G4 probes (plan way2quran-quality Q5). The transcription is faked. Quran text is read from Tanzil at
runtime and never written to a file; the G4 duplicate-word test uses PLACEHOLDER words. No model, no network.
"""

import random
from pathlib import Path

import numpy as np
import pytest
import torch

from recitation_align import gate
from recitation_align import transcribe as T
from recitation_align.anchors import usable_ayahs
from recitation_align.gate import (BAD, OK, UNSURE, ayah_starts, local_text, match_start, probe_ayah_starts,
                                   refrain_resolve, word_onset_probes)
from recitation_align.quality import PARAMS
from recitation_align.text import load_tanzil, norm

TANZIL = Path(__file__).resolve().parents[3] / "packages/quran-text-check/data/tanzil-quran-simple-1.1.txt"
GAP = 10.0  # seconds between ayah starts in the synthetic documents
GIBBERISH = "ظظظظ ضضضض ظظظظ ضضضض"  # PLACEHOLDER letters, no text


@pytest.fixture(scope="module")
def tanzil():
    return load_tanzil(TANZIL)


def ayah_words(tz, surah, a):
    return norm(tz[(surah, a)]).split()


def doc_words(tz, surah):
    """Aligned-document words: ayah n starts at n * GAP, words 0.5 s apart."""
    out = []
    for (s, a), t in sorted(tz.items()):
        if s != surah:
            continue
        for i, w in enumerate(t.split()):
            out.append({"ayah": a, "position": i + 1, "word": w, "start_ms": round((a * GAP + 0.5 * i) * 1000),
                        "end_ms": round((a * GAP + 0.5 * i + 0.4) * 1000), "confidence": 1.0})
    return out


def pick_ayah(tz, surah, min_prev=6):
    """First ayah n whose previous ayah has at least `min_prev` words."""
    return next(n for n in range(2, 60) if len(ayah_words(tz, surah, n - 1)) >= min_prev)


class Listener:
    """A fake transcriber: the clip [t - pre, t + 4.5] for ayah n returns hear(n, pre)."""

    def __init__(self, hear):
        self.hear = hear
        self.calls = []

    def __call__(self, wav, clips, batch=1):
        self.calls.append(list(clips))
        out = []
        for s, e in clips:
            t = e - PARAMS["G3_POST_S"]
            n = round(t / GAP)
            out.append({"start_s": s, "end_s": e, "text": self.hear(n, round(t - s, 3))})
        return {"clips": out, "seconds": 0.01}


def true_text(tz, surah, k=5):
    return lambda n, pre: " ".join(ayah_words(tz, surah, n)[:k])


# --- verdicts ----------------------------------------------------------------------------------------------------

def test_local_text_is_the_previous_ayah_this_one_and_eight_words_of_the_next(tanzil):
    surah = 2
    n = pick_ayah(tanzil, surah)
    loc = local_text(surah, n, tanzil)
    prev, cur, nxt = (ayah_words(tanzil, surah, a) for a in (n - 1, n, n + 1))
    assert [w for w, _, _ in loc.words] == prev + cur + nxt[:PARAMS["G3_NEXT_WORDS"]]
    assert [(a, i) for _, a, i in loc.words[:2]] == [(n - 1, 0), (n - 1, 1)]
    assert loc.last_prev == len(prev) - 1
    assert len(loc.owner) == len(loc.text)
    assert loc.owner[0] == (n - 1, 0)


def test_ok_when_the_match_begins_at_word_zero(tanzil):
    n = pick_ayah(tanzil, 36)
    loc = local_text(36, n, tanzil)
    r = match_start(" ".join(ayah_words(tanzil, 36, n)[:4]), loc)
    assert r["verdict"] == OK and r["heard"] == f"{n}:0" and r["score"] >= PARAMS["G3_SCORE"]


def test_ok_on_the_pre_roll_word(tanzil):
    n = pick_ayah(tanzil, 36)
    prev, cur = ayah_words(tanzil, 36, n - 1), ayah_words(tanzil, 36, n)
    r = match_start(" ".join([prev[-1]] + cur[:4]), local_text(36, n, tanzil))
    assert r["verdict"] == OK and r["heard"] == f"{n - 1}:{len(prev) - 1}"


def test_bad_when_the_match_begins_in_the_middle_of_the_previous_ayah(tanzil):
    n = pick_ayah(tanzil, 36)
    prev = ayah_words(tanzil, 36, n - 1)
    r = match_start(" ".join(prev[3:7]), local_text(36, n, tanzil))
    assert r["verdict"] == BAD and r["heard"] == f"{n - 1}:3"


def test_bad_when_the_match_begins_at_the_second_word(tanzil):
    n = pick_ayah(tanzil, 36)
    cur = ayah_words(tanzil, 36, n)
    r = match_start(" ".join(cur[1:5]), local_text(36, n, tanzil))
    assert r["verdict"] == BAD and r["heard"] == f"{n}:1"


def test_unsure_on_empty_text_and_on_a_low_score(tanzil):
    loc = local_text(36, pick_ayah(tanzil, 36), tanzil)
    assert match_start("", loc) == {"verdict": UNSURE, "heard": None, "score": 0.0}
    assert match_start("   ", loc)["verdict"] == UNSURE
    low = match_start(GIBBERISH, loc)
    assert low["verdict"] == UNSURE and low["score"] < PARAMS["G3_SCORE"]


# --- probe_ayah_starts -------------------------------------------------------------------------------------------

def wav_for():
    return np.zeros(16000, dtype=np.float32)


def test_every_ayah_from_two_is_probed_and_true_starts_are_ok(tanzil):
    surah = 55
    last = max(a for (s, a) in tanzil if s == surah)
    listener = Listener(true_text(tanzil, surah))
    r = probe_ayah_starts(wav_for(), doc_words(tanzil, surah), surah, tanzil, listener)
    assert sorted(r["probes"]) == list(range(2, last + 1))
    assert {p["verdict"] for p in r["probes"].values()} == {OK}
    assert r["moved"] == {} and r["unprobed"] == [] and len(listener.calls) == 1  # no re-probe needed
    first = r["probes"][2]
    assert first["start_s"] == 2 * GAP and first["pre_s"] == PARAMS["G3_PRE_S"]


def test_the_worse_reprobe_counts(tanzil):
    surah = 36
    n = pick_ayah(tanzil, surah)
    good = true_text(tanzil, surah)
    bad = " ".join(ayah_words(tanzil, surah, n - 1)[3:7])

    def hear(a, pre):
        if a != n:
            return good(a, pre)
        return {0.3: bad, 0.0: good(a, pre), 0.6: bad}[pre]

    r = probe_ayah_starts(wav_for(), doc_words(tanzil, surah), surah, tanzil, Listener(hear))
    p = r["probes"][n]
    assert p["initial"] == BAD and p["reprobed"] and p["verdict"] == BAD and p["pre_s"] == 0.6

    def hear_ok(a, pre):  # bad at the first pre-roll only: both re-probes are fine, so the start is OK
        return bad if (a == n and pre == 0.3) else good(a, pre)

    p = probe_ayah_starts(wav_for(), doc_words(tanzil, surah), surah, tanzil, Listener(hear_ok))["probes"][n]
    assert p["initial"] == BAD and p["reprobed"] and p["verdict"] == OK

    def hear_unsure(a, pre):  # unsure at 0.0, ok at 0.6: unsure is worse than ok
        return GIBBERISH if (a == n and pre in (0.3, 0.0)) else good(a, pre)

    p = probe_ayah_starts(wav_for(), doc_words(tanzil, surah), surah, tanzil, Listener(hear_unsure))["probes"][n]
    assert p["verdict"] == UNSURE


def test_a_probe_near_a_cut_moves_to_the_next_start(tanzil):
    surah = 36
    listener = Listener(true_text(tanzil, surah))
    cut = 5 * GAP + 1.0  # within 3 s of ayah 5's start, and 9 s from ayah 6's
    r = probe_ayah_starts(wav_for(), doc_words(tanzil, surah), surah, tanzil, listener, cuts=[cut])
    assert r["moved"] == {5: 6}
    assert 5 not in r["probes"] and 6 in r["probes"]
    assert len(listener.calls[0]) == len(r["probes"])  # ayah 6 is probed once


def test_adjacent_starts_near_cuts_skip_to_the_first_clear_start(tanzil):
    surah = 36
    r = probe_ayah_starts(wav_for(), doc_words(tanzil, surah), surah, tanzil, Listener(true_text(tanzil, surah)),
                          cuts=[5 * GAP, 6 * GAP], only={5, 6})
    assert r["moved"] == {5: 7, 6: 7} and list(r["probes"]) == [7]


def test_a_start_near_a_cut_with_no_later_start_is_unprobed(tanzil):
    surah = 36
    last = max(a for (s, a) in tanzil if s == surah)
    r = probe_ayah_starts(wav_for(), doc_words(tanzil, surah), surah, tanzil, Listener(true_text(tanzil, surah)),
                          cuts=[last * GAP], only={last})
    assert r["unprobed"] == [last] and r["probes"] == {}


def test_basmala_words_do_not_set_an_ayah_start():
    words = [{"ayah": 1, "start_ms": 1000, "basmala": True}, {"ayah": 1, "start_ms": 4000, "basmala": False},
             {"ayah": 2, "start_ms": 9000}]
    assert ayah_starts(words) == {1: 4.0, 2: 9.0}


# --- refrains ----------------------------------------------------------------------------------------------------

def test_a_two_ayah_refrain_shift_is_caught_by_the_unique_neighbours(tanzil):
    surah, lo, hi = 55, 13, 40
    usable = usable_ayahs(surah, tanzil)
    last = max(a for (s, a) in tanzil if s == surah)
    good = true_text(tanzil, surah)

    def hear(n, pre):  # the audio is two ayahs ahead of the document inside the shifted region
        return good(n + 2 if lo <= n <= hi else n, pre)

    r = probe_ayah_starts(wav_for(), doc_words(tanzil, surah), surah, tanzil, Listener(hear))
    raw = r["probes"]
    unique = [n for n in range(lo, hi + 1) if n in usable]
    refrain = [n for n in range(lo, hi + 1) if n not in usable]
    assert unique and refrain
    assert all(raw[n]["verdict"] != OK for n in unique)
    assert any(raw[n]["verdict"] == OK for n in refrain)  # a refrain probe alone cannot see the shift
    resolved = refrain_resolve(raw, usable)
    assert all(resolved[n]["verdict"] != OK for n in range(lo, hi + 1) if lo + 1 <= n <= hi - 1)
    assert all(resolved[n]["verdict"] == OK for n in range(2, lo - 1) if n in usable)
    assert resolved[lo]["raw"] == raw[lo]["verdict"] and resolved[lo]["refrain"] == (lo not in usable)
    assert last > hi


def test_refrain_resolve_keeps_a_clean_surah_clean(tanzil):
    surah = 55
    usable = usable_ayahs(surah, tanzil)
    raw = probe_ayah_starts(wav_for(), doc_words(tanzil, surah), surah, tanzil,
                            Listener(true_text(tanzil, surah)))["probes"]
    assert {r["verdict"] for r in refrain_resolve(raw, usable).values()} == {OK}


def test_a_refrain_ayah_next_to_a_bad_neighbour_is_bad():
    results = {2: {"verdict": OK}, 3: {"verdict": OK}, 4: {"verdict": BAD}}
    out = refrain_resolve(results, usable={2: "x", 4: "y"})
    assert out[3]["verdict"] == BAD and out[3]["neighbours"] == [2, 4] and out[3]["raw"] == OK
    assert out[2]["verdict"] == OK and out[4]["verdict"] == BAD


# --- G4 ----------------------------------------------------------------------------------------------------------

def placeholder_doc(n_words=90, seed=3, repeat=False):
    rng = random.Random(seed)
    letters = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي"
    toks = ["".join(rng.choice(letters) for _ in range(5)) for _ in range(n_words)]
    if repeat:
        toks = [t for t in toks[: n_words // 2] for _ in (0, 1)]
    words = []
    for i, t in enumerate(toks):
        words.append({"ayah": 1 + i // 10, "position": 1 + i % 10, "word": t, "start_ms": 1000 * (i + 1),
                      "end_ms": 1000 * (i + 1) + 400, "confidence": 1.0})
    return words


class WordListener:
    def __init__(self, words):
        self.words = words
        self.calls = []

    def __call__(self, wav, clips, batch=1):
        self.calls.append(list(clips))
        out = []
        for s, e in clips:
            i = next(i for i, w in enumerate(self.words) if abs(w["start_ms"] / 1000 - (s + PARAMS["G4_PRE_S"])) < 1e-3)
            out.append({"start_s": s, "end_s": e, "text": " ".join(w["word"] for w in self.words[i:i + 2])})
        return {"clips": out, "seconds": 0.0}


def test_word_probes_take_at_least_g4_min_and_scale_with_the_word_count():
    few = placeholder_doc(90)
    r = word_onset_probes(wav_for(), few, WordListener(few), "seed")
    assert r["n"] == PARAMS["G4_MIN"] and r["exact"] == r["n"] and r["bad"] == 0
    many = placeholder_doc(1200)
    assert word_onset_probes(wav_for(), many, WordListener(many), "seed")["n"] == 1200 // PARAMS["G4_PER"]


def test_a_duplicated_word_takes_the_nearest_occurrence():
    words = placeholder_doc(90, repeat=True)  # every word is said twice in a row
    r = word_onset_probes(wav_for(), words, WordListener(words), "seed")
    assert r["n"] == PARAMS["G4_MIN"] and r["exact"] == r["n"] and r["bad"] == 0


def test_word_probes_report_shifted_and_empty_clips():
    words = placeholder_doc(90)
    r = word_onset_probes(wav_for(), words, lambda wav, clips, batch=1: {
        "clips": [{"start_s": s, "end_s": e, "text": ""} for s, e in clips], "seconds": 0.0}, "seed")
    assert r["empty"] == r["n"] and r["exact"] == 0

    class Late(WordListener):  # the audio is one word later than the document says
        def __call__(self, wav, clips, batch=1):
            out = super().__call__(wav, clips)
            for c in out["clips"]:
                i = next(i for i, w in enumerate(words) if abs(w["start_ms"] / 1000 - (c["start_s"] + 0.1)) < 1e-3)
                c["text"] = " ".join(w["word"] for w in words[i + 1:i + 3])
            return out

    r = word_onset_probes(wav_for(), words, Late(words), "seed")
    assert r["pm1"] == r["n"]


def test_the_seeded_sample_is_deterministic():
    words = placeholder_doc(300)
    pick = lambda seed: [p["start_s"] for p in word_onset_probes(wav_for(), words, WordListener(words), seed)["probes"]]  # noqa: E731
    assert pick("abc") == pick("abc")
    assert pick("abc") != pick("abd")
    assert pick("abc") == sorted(pick("abc"))


# --- batching ----------------------------------------------------------------------------------------------------

class FakeProcessor:
    def __init__(self, log):
        self.log = log

    def __call__(self, audio, sampling_rate, return_tensors):
        arrays = audio if isinstance(audio, list) else [audio]
        self.log.append(("proc", len(arrays)))
        return type("F", (), {"input_features": torch.tensor([[[float(len(a)), float(a.sum())]] for a in arrays])})

    def batch_decode(self, ids, skip_special_tokens):
        return [f"  FIXTURE {int(i[0])} - not Quran  " for i in ids]


class FakeModel:
    def __init__(self, log):
        self.log = log

    def generate(self, feats, max_new_tokens):
        self.log.append(("generate", feats.shape[0]))
        return feats[:, 0, :1].long()  # one token per clip: its sample count


def test_batch_sixteen_gives_the_same_texts_as_batch_one(monkeypatch):
    log: list = []
    monkeypatch.setattr(T, "_load", lambda: (FakeProcessor(log), FakeModel(log)))
    rng = np.random.default_rng(0)
    wav = rng.standard_normal(60 * T.SAMPLE_RATE).astype(np.float32)
    clips = [(float(s), float(s) + 1.0 + (s % 7) * 0.25) for s in range(0, 40)]
    one = T.transcribe_clips(wav, clips)["clips"]
    n_one = sum(1 for k, _ in log if k == "generate")
    log.clear()
    sixteen = T.transcribe_clips(wav, clips, batch=16)["clips"]
    calls = [v for k, v in log if k == "generate"]
    assert [c["text"] for c in one] == [c["text"] for c in sixteen]
    assert [(c["start_s"], c["end_s"]) for c in sixteen] == clips
    assert n_one == 40 and calls == [16, 16, 8]


def test_clips_past_the_end_are_empty_and_never_reach_the_model(monkeypatch):
    def boom():
        raise AssertionError("an empty slice must not load the model")

    monkeypatch.setattr(T, "_load", boom)
    wav = np.zeros(16000, dtype=np.float32)
    out = T.transcribe_clips(wav, [(5.0, 9.0), (20.0, 24.0)])
    assert [c["text"] for c in out["clips"]] == ["", ""]
    assert T.transcribe_clips(wav, [])["clips"] == []


def test_the_probe_library_adds_to_transcribe_without_changing_it():
    assert gate.PARAMS is PARAMS
    assert T.transcription_key("x").endswith("|30|220")

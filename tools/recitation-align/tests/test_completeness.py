"""Completeness check (plan way2quran-quality Q2): keys, windows, verdicts and robustness.

No model and no audio file. A fake file is a timeline of words cut from the Tanzil file at test time (read from
packages/quran-text-check, never copied into the tests); the mocked transcriber returns the words that fall
inside a window. Nothing here contains Quran text.
"""

from pathlib import Path

import numpy as np
import pytest

from recitation_align import completeness as C
from recitation_align.models import SAMPLE_RATE
from recitation_align.quality import PARAMS
from recitation_align.text import load_tanzil, norm

TANZIL = Path(__file__).resolve().parents[3] / "packages/quran-text-check/data/tanzil-quran-simple-1.1.txt"
SHA = "a" * 64


@pytest.fixture(scope="module")
def ayahs():
    return load_tanzil(TANZIL)


class FakeFile:
    """Surah `surah`, ayahs first..last, read at `pace` s per word from `lead` s. `filler` extra words follow."""

    def __init__(self, ayahs, surah, first=1, last=None, pace=0.4, lead=1.0, filler=0, noise=False, tail_gap=1.0):
        n = max(a for s, a in ayahs if s == surah)
        last = last or n
        words = []
        if first == 1 and surah not in (1, 9):
            words += norm(ayahs[(1, 1)]).split()
        words += [w for a, w in C.surah_words(surah, ayahs) if first <= a <= last]
        if filler:
            words += [w for _, w in C.surah_words(1, ayahs)] * filler
        if noise:
            words = [self._noisy(w) for w in words]
        self.words = words
        self.pace, self.lead = pace, lead
        self.end = lead + len(words) * pace
        self.calls: list[tuple[float, float]] = []
        self.length_s = self.end + tail_gap

    @staticmethod
    def _noisy(word):
        """One letter changed in every word of 3 letters or more (about 15 percent of the letters)."""
        letters = list(word)
        if len(letters) >= 3:
            letters[1] = "ك" if letters[1] != "ك" else "ل"
        return "".join(letters)

    def wav(self):
        t = np.arange(int(self.length_s * SAMPLE_RATE)) / SAMPLE_RATE
        wav = np.where((t >= self.lead) & (t < self.end), 0.1 * np.sin(2 * np.pi * 440 * t), 0.0)
        return wav.astype(np.float32)

    def text(self, window):
        lo, hi = window
        return " ".join(
            w for i, w in enumerate(self.words) if lo <= self.lead + (i + 0.5) * self.pace < hi
        )

    def transcribe(self, windows):
        self.calls += list(windows)
        return [self.text(w) for w in windows]


def run(ayahs, surah, fake, **kw):
    return C.check_file(fake.wav(), surah, ayahs, SHA, 1234, fake.transcribe, **kw)


# --- keys ---------------------------------------------------------------------------------------------

def test_basmala_is_stripped_for_2_and_16_but_not_for_1_and_9(ayahs):
    basmala_first = norm(ayahs[(1, 1)]).split()[0]
    assert not C.opening_key(2, ayahs).startswith(basmala_first)
    assert not C.opening_key(16, ayahs).startswith(basmala_first)
    assert C.opening_key(1, ayahs).startswith(basmala_first)
    assert C.opening_key(9, ayahs).startswith(norm(ayahs[(9, 1)]).split()[0])


def test_every_opening_and_ending_key_is_unique_within_24_words(ayahs):
    for surah in range(1, 115):
        for from_end in (False, True):
            key, words, sim = C._key(surah, ayahs, from_end)
            assert words <= 24 and len(key.split()) == words, (surah, from_end)
            assert sim < PARAMS["KEY_UNIQUE"], (surah, from_end, sim)


def test_a_refrain_ending_grows_past_six_words(ayahs):
    assert C._key(55, ayahs, True)[1] > 6
    assert C._key(2, ayahs, True)[1] > 6


def test_the_key_for_108_crosses_ayahs(ayahs):
    key, words, _ = C._key(108, ayahs, True)
    tail = C.surah_words(108, ayahs)[-words:]
    assert len({a for a, _ in tail}) >= 2
    assert key == " ".join(w for _, w in tail)


def test_tanzil_text_is_not_changed_by_the_check(ayahs):
    before = dict(ayahs)
    C.opening_key(2, ayahs)
    C.ending_key(2, ayahs)
    C.heard_ayahs(norm(ayahs[(2, 5)]), 2, ayahs)
    assert ayahs == before


# --- sound and windows --------------------------------------------------------------------------------

def test_silence_plus_a_tone_is_trimmed():
    wav = np.zeros(SAMPLE_RATE * 40, dtype=np.float32)
    t = np.arange(SAMPLE_RATE * 10) / SAMPLE_RATE
    wav[SAMPLE_RATE * 12: SAMPLE_RATE * 22] = 0.1 * np.sin(2 * np.pi * 440 * t)
    first, last = C.sound_bounds(wav)
    assert first == pytest.approx(12.0, abs=0.2)
    assert last == pytest.approx(22.0, abs=0.2)
    assert C.sound_bounds(np.zeros(SAMPLE_RATE * 5, dtype=np.float32)) == (0.0, 0.0)


def test_windows_are_30_s_steps_and_capped():
    head = C.head_windows(12.0)
    assert len(head) == 4 and head[0] == (12.0, 42.0) and head[1][0] == 42.0
    assert C.head_windows(12.0, 20.0) == [(12.0, 20.0)]
    tail = C.tail_windows(1000.0)
    assert len(tail) == 10 and tail[0] == (970.0, 1000.0) and tail[1] == (940.0, 970.0)
    assert C.tail_windows(50.0) == [(20.0, 50.0), (0.0, 20.0)]
    assert C.tail_windows(0.0) == []


# --- verdicts -----------------------------------------------------------------------------------------

def test_a_complete_file_with_shared_texts_needs_no_extra_calls(ayahs):
    fake = FakeFile(ayahs, 108)
    first, last = C.sound_bounds(fake.wav())
    head, tail = C.head_windows(first, last)[0], C.tail_windows(last)[0]
    shared = {head: fake.text(head), tail: fake.text(tail)}
    rec = run(ayahs, 108, fake, shared_texts=shared)
    assert rec["verdict"] == "complete"
    assert rec["asr_calls_extra"] == 0 and fake.calls == []
    assert (rec["first_heard_ayah"], rec["last_heard_ayah"]) == (1, rec["ayah_count"])
    assert C.recorded_range(rec) == (1, rec["ayah_count"])


def test_an_ending_heard_only_in_tail_window_4_is_complete(ayahs):
    fake = FakeFile(ayahs, 108, filler=8)  # about 90 s of other words after the surah
    rec = run(ayahs, 108, fake)
    assert rec["verdict"] == "complete"
    assert rec["windows"]["tail"] == 4
    assert rec["ending"]["heard"] and len(rec["ending"]["scores"]) == 4
    surah_end = fake.lead + (len(fake.words) - len(C.surah_words(1, ayahs)) * 8) * fake.pace
    assert rec["ending_at_s"] == pytest.approx(surah_end, abs=4.0)
    assert rec["trailing_s"] == pytest.approx(rec["last_sound_s"] - rec["ending_at_s"], abs=0.11)
    assert rec["trailing_s"] > 60


def test_a_file_holding_16_53_to_119_is_incomplete_both(ayahs):
    fake = FakeFile(ayahs, 16, first=53, last=119, pace=0.8)
    rec = run(ayahs, 16, fake)
    assert rec["verdict"] == "incomplete-both"
    assert (rec["first_heard_ayah"], rec["last_heard_ayah"]) == (53, 119)
    assert C.recorded_range(rec) == (53, 119)
    assert not rec["opening"]["heard"] and not rec["ending"]["heard"]
    assert max(rec["opening"]["scores"]) < PARAMS["KEY_PASS"] and max(rec["ending"]["scores"]) < PARAMS["KEY_PASS"]
    assert rec["ending_at_s"] is None and rec["trailing_s"] is None


def test_the_window_caps_hold(ayahs):
    fake = FakeFile(ayahs, 16, first=53, last=119, pace=0.8)
    assert fake.end > 300 + 120
    rec = run(ayahs, 16, fake)
    assert rec["windows"] == {"head": 4, "tail": 10}
    assert rec["asr_calls_extra"] == 14 == len(fake.calls)


def test_a_missing_opening_is_incomplete_start(ayahs):
    fake = FakeFile(ayahs, 18, first=5, last=110)
    rec = run(ayahs, 18, fake)
    assert rec["verdict"] == "incomplete-start"
    assert rec["ending"]["heard"] and not rec["opening"]["heard"]
    assert (rec["first_heard_ayah"], rec["last_heard_ayah"]) == (5, 110)


def test_a_missing_ending_is_incomplete_end(ayahs):
    fake = FakeFile(ayahs, 18, first=1, last=60)
    rec = run(ayahs, 18, fake)
    assert rec["verdict"] == "incomplete-end"
    assert rec["opening"]["heard"] and not rec["ending"]["heard"]
    assert (rec["first_heard_ayah"], rec["last_heard_ayah"]) == (1, 60)


def test_no_surah_text_heard_is_unverified(ayahs):
    fake = FakeFile(ayahs, 112)
    rec = C.check_file(fake.wav(), 112, ayahs, SHA, 10, lambda ws: [""] * len(ws))
    assert rec["verdict"] == "unverified"
    assert rec["first_heard_ayah"] is None and rec["last_heard_ayah"] is None
    assert C.recorded_range(rec) is None


def test_a_silent_file_is_unverified_without_any_call(ayahs):
    calls = []
    rec = C.check_file(np.zeros(SAMPLE_RATE * 5, np.float32), 112, ayahs, SHA, 10, lambda ws: calls.append(ws))
    assert rec["verdict"] == "unverified" and calls == [] and rec["windows"] == {"head": 0, "tail": 0}


def test_the_record_has_the_stored_shape(ayahs):
    from recitation_align.report import COMPLETENESS_KEYS, validate_completeness

    rec = run(ayahs, 108, FakeFile(ayahs, 108), file="108.mp3", source_last_modified="Mon, 01 Jan 2024 00:00:00 GMT")
    assert set(rec) == COMPLETENESS_KEYS
    validate_completeness(rec)
    assert rec["check"].startswith("completeness-1|") and rec["file"] == "108.mp3"
    assert set(rec["opening"]) == {"words", "scores", "heard", "at_s"}


# --- robustness ---------------------------------------------------------------------------------------

def test_asr_noise_of_one_letter_per_word_still_passes(ayahs):
    rec = run(ayahs, 100, FakeFile(ayahs, 100, noise=True))
    assert rec["verdict"] == "complete"
    assert min(rec["opening"]["scores"][-1], rec["ending"]["scores"][-1]) >= PARAMS["KEY_PASS"]


def test_suspect_duration_fires_below_0_7_of_the_median_and_never_excludes():
    def rec(surah, mpl, verdict="complete"):
        return {"surah": surah, "verdict": verdict, "ms_per_letter": mpl}

    records = [rec(1, 100), rec(2, 104), rec(3, 96), rec(4, 60), rec(5, 20, "incomplete-end")]
    flags = C.duration_flags(records)
    assert flags == {4: ["suspect-duration"]}
    assert records[3]["verdict"] == "complete"
    assert C.duration_flags([rec(5, 20, "incomplete-end")]) == {}
    assert C.duration_flags([]) == {}


def test_heard_ayahs_prefers_the_ayah_followed_by_its_successor(ayahs):
    # a refrain-like head: ayah 5 and ayah 6 read in order must give 5, not an earlier lookalike
    text = " ".join(norm(ayahs[(18, a)]) for a in (5, 6, 7))
    assert C.heard_ayahs(text, 18, ayahs) == (5, 7)

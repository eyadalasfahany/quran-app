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

    def __init__(self, ayahs, surah, first=1, last=None, pace=0.4, lead=1.0, filler=0, noise=False, tail_gap=1.0,
                 cap=None, loop_until=None, lost_ayahs=()):
        n = max(a for s, a in ayahs if s == surah)
        last = last or n
        words = []
        if first == 1 and surah not in (1, 9):
            words += norm(ayahs[(1, 1)]).split()
        # ayahs in `lost_ayahs` are recited but the ASR renders each of their words as one letter
        words += ["ك" if a in lost_ayahs else w for a, w in C.surah_words(surah, ayahs) if first <= a <= last]
        if filler:
            words += [w for _, w in C.surah_words(1, ayahs)] * filler
        if noise:
            words = [self._noisy(w) for w in words]
        self.words = words
        self.pace, self.lead = pace, lead
        self.end = lead + len(words) * pace
        self.calls: list[tuple[float, float]] = []
        self.length_s = self.end + tail_gap
        self.cap = cap  # the ASR token cap: only the first `cap` words of a window are transcribed
        # an ASR repetition loop: a window longer than a probe window that holds sound before `loop_until` s gives
        # one letter repeated; words before `loop_until` are never transcribed
        self.loop_until = loop_until

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
        if self.loop_until is not None:
            if hi - lo > C.PROBE_S and lo < self.loop_until:
                return " ".join(["ك"] * 150)
            lo = max(lo, self.loop_until)
        words = [w for i, w in enumerate(self.words) if lo <= self.lead + (i + 0.5) * self.pace < hi]
        return " ".join(words[: self.cap] if self.cap else words)

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
    assert len(rec["opening"]["probe"]["windows"]) == 3 and len(rec["ending"]["probe"]["windows"]) == 3
    assert rec["asr_calls_extra"] == 20 == len(fake.calls)  # 4 head, 3 head probe, 10 tail, 3 end probe


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
    assert rec["check"].startswith("completeness-2|") and rec["file"] == "108.mp3"
    assert set(rec["ending"]) == {"words", "scores", "heard", "at_s", "probe"}
    assert set(rec["opening"]) == set(rec["ending"]) | {"letters_key_words"}
    assert rec["opening"]["letters_key_words"] is None
    assert rec["opening"]["probe"] is None and rec["ending"]["probe"] is None


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


# --- the end probe (plan Q2b: the ASR token cap cuts the end of a dense 30 s window) ----------------------

CAP = 45  # words: a 30 s window at 0.4 s per word holds 75, a 16 s probe window 40


def test_probe_windows_cover_30_s_in_three_overlapping_windows():
    assert C.probe_windows(1000.0) == [(970.0, 986.0), (977.0, 993.0), (984.0, 1000.0)]
    assert C.probe_windows(20.0, 2.0) == [(2.0, 6.0), (2.0, 13.0), (4.0, 20.0)]
    assert C.probe_windows(10.0, 9.5) == []
    assert C.head_probe_windows(12.0, 1000.0) == [(12.0, 28.0), (19.0, 35.0), (26.0, 42.0)]
    assert C.head_probe_windows(12.0, 20.0) == [(12.0, 20.0), (19.0, 20.0)]


def test_a_complete_file_cut_by_the_token_cap_is_complete_through_the_probe(ayahs):
    fake = FakeFile(ayahs, 18, cap=CAP)
    rec = run(ayahs, 18, fake)
    assert rec["ending"]["scores"][0] < PARAMS["KEY_PASS"]  # the 30 s window alone fails
    assert rec["ending"]["probe"]["heard"] and rec["ending"]["probe"]["score"] >= PARAMS["KEY_PASS"]
    assert rec["verdict"] == "complete" and rec["last_heard_ayah"] == rec["ayah_count"]
    assert rec["windows"]["tail"] == 1 and rec["asr_calls_extra"] == 1 + 1 + 3
    assert rec["ending_at_s"] == pytest.approx(fake.end, abs=1.0)


def test_the_same_file_without_the_cap_needs_no_probe(ayahs):
    rec = run(ayahs, 18, FakeFile(ayahs, 18))
    assert rec["verdict"] == "complete" and rec["ending"]["probe"] is None
    assert rec["asr_calls_extra"] == 2


def test_a_missing_ending_under_the_cap_stays_incomplete_end(ayahs):
    fake = FakeFile(ayahs, 18, first=1, last=107, cap=CAP)
    rec = run(ayahs, 18, fake)
    assert rec["verdict"] == "incomplete-end"
    assert not rec["ending"]["heard"] and not rec["ending"]["probe"]["heard"]
    assert rec["ending"]["probe"]["score"] < PARAMS["KEY_PASS"]
    assert rec["last_heard_ayah"] < rec["ayah_count"]


def test_a_short_trailer_after_the_ending_still_passes_through_the_probe(ayahs):
    fake = FakeFile(ayahs, 18, filler=1, pace=0.3, cap=CAP)  # about 9 s of other words after the surah
    assert len(C.surah_words(1, ayahs)) * fake.pace < C.PROBE_SPAN_S - C.PROBE_S
    rec = run(ayahs, 18, fake)
    assert rec["ending"]["scores"][0] < PARAMS["KEY_PASS"]
    assert rec["verdict"] == "complete" and rec["ending"]["probe"]["heard"]
    assert rec["trailing_s"] > 5


def test_probe_calls_are_counted_and_shared_texts_reused(ayahs):
    fake = FakeFile(ayahs, 18, cap=CAP)
    first, last = C.sound_bounds(fake.wav())
    shared = {w: fake.text(w) for w in [C.head_windows(first, last)[0], C.tail_windows(last)[0]] + C.probe_windows(last, first)}
    fake.calls.clear()
    rec = run(ayahs, 18, fake, shared_texts=shared)
    assert rec["verdict"] == "complete" and rec["asr_calls_extra"] == 0 and fake.calls == []


def test_an_opening_lost_to_an_asr_loop_is_heard_through_the_head_probe(ayahs):
    fake = FakeFile(ayahs, 18, loop_until=2.6)  # the loop covers the basmala's seconds only
    rec = run(ayahs, 18, fake)
    assert rec["opening"]["scores"][0] < PARAMS["KEY_PASS"]
    assert rec["opening"]["probe"]["heard"] and fake.lead <= rec["opening"]["at_s"] < fake.lead + C.PROBE_S
    assert rec["verdict"] == "complete" and rec["first_heard_ayah"] == 1
    assert rec["windows"]["head"] == 1


def test_a_missing_opening_under_an_asr_loop_stays_incomplete_start(ayahs):
    fake = FakeFile(ayahs, 18, first=5, last=110, loop_until=2.0)
    rec = run(ayahs, 18, fake)
    assert rec["verdict"] == "incomplete-start"
    assert not rec["opening"]["probe"]["heard"] and rec["opening"]["probe"]["score"] < PARAMS["KEY_PASS"]



# --- the key score: coverage and edge (plan Q2b) ------------------------------------------------------

def _context(surah, ayahs, upto):
    """Normalised surah words up to (not including) word index `upto`, as one string."""
    return " ".join(w for _, w in C.surah_words(surah, ayahs)[:upto])


def test_a_full_key_in_context_scores_100(ayahs):
    key = C.ending_key(2, ayahs)
    text = _context(2, ayahs, len(C.surah_words(2, ayahs)))
    assert C.key_score(key, text, from_end=True)[0] == 100.0


def test_a_three_letter_fragment_of_the_key_fails(ayahs):
    for surah, from_end in ((36, False), (18, False), (18, True), (42, False)):
        for key, lose in C.key_set(surah, ayahs, from_end=from_end):
            frag = key[-3:] if from_end else key[:3]
            for text in (frag, key.split()[0], key.split()[-1]):
                assert C.key_score(key, text, from_end=from_end, lose_outer=lose)[0] < PARAMS["KEY_PASS"], surah


def test_a_transcript_ending_two_words_before_the_key_ends_fails(ayahs):
    for surah in (2, 18, 55, 108):
        n = len(C.surah_words(surah, ayahs))
        for key, lose in C.key_set(surah, ayahs, from_end=True):
            assert C.key_score(key, _context(surah, ayahs, n), from_end=True, lose_outer=lose)[0] >= PARAMS["KEY_PASS"]
            assert C.key_score(key, _context(surah, ayahs, n - 2), from_end=True,
                               lose_outer=lose)[0] < PARAMS["KEY_PASS"], surah


def test_a_transcript_starting_two_words_after_the_key_starts_fails(ayahs):
    for surah in (2, 18, 36, 42, 103):
        words = [w for _, w in C.surah_words(surah, ayahs)]
        whole = " ".join(words[:60])
        assert max(C.key_score(k, whole, from_end=False, lose_outer=lo)[0]
                   for k, lo in C.key_set(surah, ayahs, from_end=False)) >= PARAMS["KEY_PASS"]
        letters = C.LETTERS_AYAHS.get(surah, 0)  # one word per letters-only ayah: those may be lost, by design
        for k, lo in C.key_set(surah, ayahs, from_end=False):
            start = 2 + (letters if k.split()[0] != words[0] else 0)  # two words past the start of this key
            assert C.key_score(k, " ".join(words[start:60]), from_end=False, lose_outer=lo)[0] < PARAMS["KEY_PASS"], surah


def test_the_letters_key_starts_after_the_letters_ayahs(ayahs):
    words = C.surah_words(36, ayahs)
    key, n, sim = C.letters_key(36, ayahs)
    assert key.split()[0] == next(w for a, w in words if a == 2) and sim < PARAMS["KEY_UNIQUE"]
    assert C.letters_key(42, ayahs)[0].split()[0] == next(w for a, w in C.surah_words(42, ayahs) if a == 3)
    assert C.letters_key(18, ayahs) is None and C.letters_key(55, ayahs) is None
    for surah in C.LETTERS_AYAHS:  # every listed opening is one short word per skipped ayah
        assert all(len([w for a, w in C.surah_words(surah, ayahs) if a == k]) == 1
                   for k in range(1, C.LETTERS_AYAHS[surah] + 1)), surah


def test_one_lost_letters_word_is_tolerated_by_the_edge(ayahs):
    rec = run(ayahs, 19, FakeFile(ayahs, 19, lost_ayahs=(1,)))
    assert rec["verdict"] == "complete" and rec["opening"]["scores"][0] >= PARAMS["KEY_PASS"]


def test_letters_rendered_as_noise_pass_on_the_letters_key(ayahs):
    fake = FakeFile(ayahs, 42, lost_ayahs=(1, 2))  # two letters-only ayahs: two outer words lost
    first, last = C.sound_bounds(fake.wav())
    window0 = norm(fake.text(C.head_windows(first, last)[0]))
    assert C.key_score(C.opening_key(42, ayahs), window0, from_end=False)[0] < PARAMS["KEY_PASS"]
    rec = run(ayahs, 42, fake)
    assert rec["verdict"] == "complete" and rec["opening"]["letters_key_words"] >= 6
    assert rec["opening"]["scores"][0] >= PARAMS["KEY_PASS"] and rec["opening"]["probe"] is None


def test_a_letters_only_transcript_does_not_pass(ayahs):
    letters = next(w for a, w in C.surah_words(36, ayahs) if a == 1)
    fake = FakeFile(ayahs, 36)
    rec = C.check_file(fake.wav(), 36, ayahs, SHA, 10, lambda ws: [letters] * len(ws))
    assert not rec["opening"]["heard"] and not rec["ending"]["heard"]
    assert max(rec["opening"]["scores"]) < PARAMS["KEY_PASS"] and rec["opening"]["probe"]["score"] < PARAMS["KEY_PASS"]


def test_a_file_missing_its_first_ayahs_after_the_letters_stays_incomplete_start(ayahs):
    fake = FakeFile(ayahs, 36, first=4)
    rec = run(ayahs, 36, fake)
    assert rec["verdict"] == "incomplete-start" and rec["first_heard_ayah"] >= 4


def test_one_word_lost_at_the_outer_edge_is_tolerated_two_are_not(ayahs):
    key = C.ending_key(18, ayahs)
    n = len(C.surah_words(18, ayahs))
    assert C.key_score(key, _context(18, ayahs, n - 1), from_end=True)[0] >= PARAMS["KEY_PASS"]
    assert C.key_score(key, _context(18, ayahs, n - 2), from_end=True)[0] < PARAMS["KEY_PASS"]


def test_a_repeated_word_inside_the_key_still_passes(ayahs):
    words = [w for _, w in C.surah_words(44, ayahs)]
    key = C.ending_key(44, ayahs)
    k = len(key.split())
    text = " ".join(words[: len(words) - 2] + [words[-3]] + words[-2:])  # the third-last word read twice
    assert len(text.split()) == len(words) + 1 and k >= 3
    assert C.key_score(key, text, from_end=True)[0] >= PARAMS["KEY_PASS"]


def test_head_probe_adds_windows_at_opening_pauses():
    assert C.head_probe_windows(0.0, 1000.0, [0.6, 4.9, 9.4, 12.0, 13.5]) == [
        (0.0, 16.0), (7.0, 23.0), (14.0, 30.0), (4.9, 20.9), (9.4, 25.4), (12.0, 28.0)]
    wav = np.full(SAMPLE_RATE * 40, 0.1, dtype=np.float32)
    wav[int(SAMPLE_RATE * 5.0): int(SAMPLE_RATE * 5.5)] = 0.0  # a 0.5 s pause ending at 5.5 s
    wav[int(SAMPLE_RATE * 9.0): int(SAMPLE_RATE * 9.1)] = 0.0  # too short to count
    assert C.opening_pauses(wav, 0.0) == [5.5]


def test_the_key_set_holds_the_long_forms_and_the_letters_keys(ayahs):
    keys = C.key_set(36, ayahs, from_end=False)
    assert len(keys) == 4 and all(lo for _, lo in keys)
    assert keys[2][0].split()[0] == next(w for a, w in C.surah_words(36, ayahs) if a == 2)
    assert len(keys[1][0].split()) == 2 * len(keys[0][0].split())
    short, long_ = (k for k, _ in C.key_set(103, ayahs, from_end=True))
    n = len(C.surah_words(103, ayahs))
    assert len(long_.split()) == min(n, 2 * len(short.split())) and long_.endswith(short)
    assert len(C.key_set(18, ayahs, from_end=True)) == 2


def test_a_misheard_word_in_the_key_passes_on_the_long_key(ayahs):
    words = [w for _, w in C.surah_words(18, ayahs)]
    key = C.ending_key(18, ayahs)
    k = len(key.split())
    garbled = words[: len(words) - k + 1] + ["ك"] + words[len(words) - k + 2:]  # the key's second word misheard
    text = " ".join(garbled)
    short, long_ = (C.key_score(kk, text, from_end=True, lose_outer=lo)[0] for kk, lo in C.key_set(18, ayahs, from_end=True))
    assert long_ > short and long_ >= PARAMS["KEY_PASS"]

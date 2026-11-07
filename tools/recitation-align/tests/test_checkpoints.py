"""ASR checkpoints and segmented alignment (plan way2quran-quality Q4). No model, no network, no Quran text.

Every word below is a PLACEHOLDER: random strings of Arabic letters built from a fixed seed, so that `text.norm`
keeps them (it drops anything outside the Arabic letter range). They are not words of any text. Emissions are
faked: each token is certain on its own frames and blank elsewhere.
"""

import random

import pytest
import torch
from rapidfuzz import fuzz

from recitation_align import checkpoints as cp
from recitation_align.checkpoints import (AnchorsInsufficient, Checkpoint, Located, align_cut, anchored_align,
                                          chain, grid_windows, local_checkpoints, locate_chunks, pace_breaks,
                                          pick_cuts, required_checkpoints, schedule, skipped_windows)
from recitation_align.quality import PARAMS

LETTERS = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي"


def placeholder_words(n, seed=7, size=4):
    """PLACEHOLDER keys: n distinct random letter strings (not words of any text)."""
    rng = random.Random(seed)
    out, seen = [], set()
    while len(out) < n:
        w = "".join(rng.choice(LETTERS) for _ in range(size))
        if w not in seen:
            seen.add(w)
            out.append(w)
    return out


KEYS = placeholder_words(800)


def window(start, end, words):
    return {"start_s": start, "end_s": end, "text": " ".join(words)}


def char_pace(keys, seconds):
    return len(" ".join(keys)) / seconds


# --- schedule ---------------------------------------------------------------------------------------------------

def test_the_schedule_holds_the_head_and_tail_windows_and_every_nth_grid_window():
    head, tail = [(0.4, 30.4)], [(580.0, 610.0)]
    s = schedule(612.0, head, tail, 4)
    assert (0.4, 30.4) in s and (580.0, 610.0) in s
    assert (0.0, 30.0) not in s  # grid window 0 is replaced by the head window (P11)
    assert (120.0, 150.0) in s and (240.0, 270.0) in s and (480.0, 510.0) in s
    assert (30.0, 60.0) not in s
    assert s == sorted(s)


def test_a_grid_window_overlapping_a_tail_window_is_dropped():
    s = schedule(500.0, [(0.0, 30.0)], [(465.0, 495.0)], 4)
    assert (480.0, 500.0) not in s  # overlaps the tail window: the same audio is not transcribed twice
    assert (465.0, 495.0) in s
    assert all(not (a[0] < b[1] and b[0] < a[1]) for a, b in zip(s, s[1:]))


def test_the_last_grid_window_is_cut_at_the_end_and_short_ones_dropped():
    assert grid_windows(61.5)[-1] == (60.0, 61.5)
    assert grid_windows(60.5) == [(0.0, 30.0), (30.0, 60.0)]


def test_skipped_windows_are_the_grid_windows_left_out():
    s = schedule(300.0, [(0.0, 30.0)], [(270.0, 300.0)], 4)
    skipped = skipped_windows(300.0, s)
    assert (30.0, 60.0) in skipped and (120.0, 150.0) not in skipped and (270.0, 300.0) not in skipped


# --- locate -----------------------------------------------------------------------------------------------------

def test_windows_are_located_in_order():
    ch = [window(0, 30, KEYS[0:30]), window(30, 60, KEYS[30:60]), window(60, 90, KEYS[60:90])]
    loc = locate_chunks(ch, KEYS[:200], char_pace(KEYS[:200], 200))
    assert [(x.ws, x.we) for x in loc] == [(0, 29), (30, 59), (60, 89)]
    assert all(x.status == "ok" for x in loc)


def test_a_backward_step_is_a_repeat_and_keeps_the_cursor():
    ch = [window(0, 30, KEYS[0:30]), window(30, 60, KEYS[10:30]), window(60, 90, KEYS[30:60])]
    loc = locate_chunks(ch, KEYS[:200], char_pace(KEYS[:200], 200))
    assert [x.status for x in loc] == ["ok", "repeat", "ok"]
    assert loc[2].ws == 30


def test_unmatched_and_short_windows_are_skipped():
    noise = placeholder_words(30, seed=99, size=5)
    ch = [window(0, 30, KEYS[0:2]), window(30, 60, noise), window(60, 90, KEYS[0:30])]
    loc = locate_chunks(ch, KEYS[:200], char_pace(KEYS[:200], 200))
    assert [x.chunk for x in loc] == [2]


def noisy(words, every, seed=3):
    """Change one letter in every `every`-th placeholder word."""
    rng = random.Random(seed)
    out = []
    for i, w in enumerate(words):
        if i % every == 0:
            j = rng.randrange(len(w))
            w = w[:j] + ("ي" if w[j] != "ي" else "ب") + w[j + 1:]
        out.append(w)
    return out


def test_the_whole_surah_fallback_needs_score_far():
    pace = char_pace(KEYS, 4000)  # slow: the forward region stays at its 800-character floor
    far_exact = [window(0, 30, KEYS[600:630])]
    loc = locate_chunks(far_exact, KEYS, pace)
    assert [(x.status, x.ws) for x in loc] == [("far", 600)]

    weaker = noisy(KEYS[600:630], every=1)
    score = fuzz.partial_ratio_alignment(" ".join(weaker), " ".join(KEYS)).score
    assert PARAMS["SCORE_NEAR"] <= score < PARAMS["SCORE_FAR"]  # good enough forward, not far away
    assert locate_chunks([window(0, 30, weaker)], KEYS, pace) == []
    near = locate_chunks([window(0, 30, noisy(KEYS[10:40], every=1))], KEYS, pace)
    assert [x.status for x in near] == ["ok"]


def test_the_forward_region_grows_with_the_elapsed_time():
    pace = char_pace(KEYS, 800)  # one placeholder word (5 characters) per second
    late = [window(0, 30, KEYS[0:30]), window(570, 600, KEYS[570:600])]
    loc = locate_chunks(late, KEYS, pace)
    assert [x.status for x in loc] == ["ok", "ok"]  # 2 x pace x 570 s reaches word 570


def test_the_chain_drops_out_of_order_windows_and_pace_outliers():
    # one word (3 tokens) per second
    located = [Located(0, 0, 30, 0, 29, 100), Located(1, 30, 60, 30, 59, 100), Located(2, 60, 90, 60, 89, 100),
               Located(3, 90, 120, 300, 329, 100),  # 240 words in 30 s: a pace outlier
               Located(4, 120, 150, 5, 9, 100)]  # out of order
    out = chain(located, [3] * 400, 3.0)
    assert [x.chunk for x in out] == [0, 1, 2]
    assert located[3].status == "pace" and located[4].status == "order"


# --- synthetic emissions ----------------------------------------------------------------------------------------

V = 8  # blank 0, letters 1..7


def synthetic(word_ayahs, frames_per_word=50, lead=0, tail=0):
    """Two tokens per word, each certain on 10 frames; blank elsewhere. Returns em, tokens, wot, aow, starts."""
    n = len(word_ayahs)
    total = lead + n * frames_per_word + tail
    em = torch.full((total, V), -20.0)
    em[:, 0] = 0.0
    tokens, wot, starts = [], [], []
    for wi in range(n):
        f = lead + wi * frames_per_word
        starts.append(f)
        for k in range(2):
            tok = 1 + (2 * wi + k) % (V - 1)
            em[f + 12 * k:f + 12 * k + 10, :] = -20.0
            em[f + 12 * k:f + 12 * k + 10, tok] = 0.0
            tokens.append(tok)
            wot.append(wi)
    return em, tokens, wot, list(word_ayahs), starts


def ayahs_of(per_ayah):
    return [a for a, k in enumerate(per_ayah, start=1) for _ in range(k)]


def test_checkpoints_never_come_from_edge_words_or_edge_seconds():
    aow = ayahs_of([4] * 6)  # ayah starts at words 0, 4, 8, 12, 16, 20; one word per second
    em, tokens, wot, aow, starts = synthetic(aow)
    kept = [Located(0, 3.0, 13.0, 3, 12, 100)]  # starts at 4 s (edge word, edge second), 8 s, 12 s (edge word)
    out = local_checkpoints(em, kept, tokens, wot, aow, 0, 50.0, set(range(1, 7)))
    assert len(out) == 1 and out[0].ayah == 3 and out[0].frame == starts[8]
    assert set(out[0].words) == set(range(5, 11))  # interior words only

    # two words per second: ayah 2 starts at word 4 = 2.0 s, two words inside a window that starts at word 2
    em, tokens, wot, aow, starts = synthetic(aow, frames_per_word=25)
    only_ayah_2 = {1, 2}
    near_edge = local_checkpoints(em, [Located(0, 1.0, 12.0, 2, 23, 100)], tokens, wot, aow, 0, 50.0, only_ayah_2)
    assert near_edge[0].ayah == -1  # 1.0 s after the window start: inside EDGE_S
    clear = local_checkpoints(em, [Located(0, 0.0, 12.0, 2, 23, 100)], tokens, wot, aow, 0, 50.0, only_ayah_2)
    assert clear[0].ayah == 2 and clear[0].frame == starts[4]


def test_refrain_ayahs_never_become_checkpoints():
    aow = ayahs_of([4] * 6)
    em, tokens, wot, aow, starts = synthetic(aow)
    kept = [Located(0, 0.0, 24.0, 0, 23, 100)]
    every = local_checkpoints(em, kept, tokens, wot, aow, 0, 50.0, set(range(1, 7)))
    assert every[0].ayah in (2, 3, 4, 5)
    usable = {1}
    none = local_checkpoints(em, kept, tokens, wot, aow, 0, 50.0, usable)
    assert none[0].ayah == -1


def test_usable_ayahs_drop_a_near_duplicate_pair():
    from recitation_align.anchors import usable_ayahs

    w = placeholder_words(20, seed=11)
    ayahs = {(1, 1): " ".join(w[0:4]), (1, 2): " ".join(w[4:8]), (1, 3): " ".join(w[8:12]),
             (1, 4): " ".join(w[4:8]), (1, 5): " ".join(w[12:16])}  # 2 and 4 are a placeholder refrain
    assert set(usable_ayahs(1, ayahs)) == {1, 3, 5}


def test_pick_cuts_keeps_its_spacing_and_increasing_ayahs_and_never_cuts_at_ayah_one():
    cps = [Checkpoint(a, a, f, c, a) for a, f, c in
           [(1, 6000, .99), (2, 1000, .9), (3, 6000, .7), (4, 6500, .95), (5, 13000, .8), (5, 13100, .99)]]
    cuts = pick_cuts(cps, 100, 50)  # 100 s = 5000 frames
    assert [c.ayah for c in cuts] == [4, 5]
    assert all(b.frame - a.frame >= 5000 for a, b in zip(cuts, cuts[1:]))
    assert pick_cuts(cps, 0, 50)[0].ayah == 2
    assert all(c.ayah > 1 for c in pick_cuts(cps, 0, 50))


# --- segmented alignment ----------------------------------------------------------------------------------------

def fake_align(fail_when):
    calls = []

    def align(em, tokens, wot, aow, blank, leading_star, **kw):
        calls.append((aow[0], leading_star))
        if fail_when(aow):
            raise RuntimeError("CTC targets longer than the frames (faked)")
        return {wi: {"start": wi, "end": wi + 1, "score": [1.0]} for wi in sorted(set(wot))}

    return align, calls


def test_align_cut_merges_a_failing_segment_and_logs_it():
    aow = ayahs_of([2] * 5)
    tokens, wot = list(range(10)), list(range(10))
    em = torch.zeros(1000, V)
    align, calls = fake_align(lambda a: a[0] == 3 and a[-1] == 3)  # the segment holding only ayah 3 fails
    logs = []
    agg, used, merges = align_cut(em, tokens, wot, aow, 0, [(2, 200), (3, 400), (4, 600)], logs.append,
                                  align_fn=align)
    assert used == [(2, 200), (3, 400)]  # the cut at the failing segment's end is dropped
    assert merges == [{"segment": 2, "dropped_cut_ayah": 4, "reason": "CTC targets longer than the frames (faked)"}]
    assert set(agg) == set(range(10)) and logs
    assert [ls for a0, ls in calls if a0 == aow[0]] and all(ls == (a0 == 1) for a0, ls in calls if a0 != 1)


def test_align_cut_with_only_segment_zero_has_a_leading_star():
    aow = ayahs_of([2] * 3)
    align, calls = fake_align(lambda a: False)
    align_cut(torch.zeros(300, V), list(range(6)), list(range(6)), aow, 0, [(2, 100), (3, 200)], align_fn=align)
    assert calls == [(1, True), (2, False), (3, False)]


def test_align_cut_raises_when_no_cut_is_left():
    aow = ayahs_of([2] * 3)
    align, _ = fake_align(lambda a: True)
    with pytest.raises(RuntimeError, match="no cut left"):
        align_cut(torch.zeros(300, V), list(range(6)), list(range(6)), aow, 0, [(2, 100), (3, 200)],
                  lambda m: None, align_fn=align)


def test_segmented_alignment_equals_the_whole_pass_on_clean_audio():
    from recitation_align.align import align_emissions

    aow = ayahs_of([5] * 8)
    em, tokens, wot, aow, starts = synthetic(aow, lead=40, tail=40)
    whole = align_emissions(em, tokens, wot, aow, 0, leading_star=True, **cp.SETTINGS)
    cuts = [(3, starts[10] - 2), (6, starts[25] - 2)]
    agg, used, merges = align_cut(em, tokens, wot, aow, 0, cuts, lambda m: None)
    assert used == cuts and merges == []
    assert {k: (v["start"], v["end"]) for k, v in agg.items()} == {k: (v["start"], v["end"]) for k, v in whole.items()}


# --- pace breaks and the fail-safe ------------------------------------------------------------------------------

def kept_every(starts_ws, span=30):
    return [Located(i, t, t + 30, ws, ws + span - 1, 100) for i, (t, ws) in enumerate(starts_ws)]


def test_pace_breaks_flag_a_synthetic_jump():
    # one placeholder word per second; 200 words are missing after 450 s (a spliced file)
    def ws_at(t):
        return t if t < 450 else t + 200

    kept = kept_every([(t, ws_at(t)) for t in (0, 120, 240, 360, 480)])
    grid = [(float(t), float(t + 30)) for t in range(0, 510, 30)]
    skipped = [w for w in grid if w[0] % 120]
    asked = []

    def transcribe(ws):
        asked.extend(ws)
        return [" ".join(KEYS[ws_at(int(s)):ws_at(int(s)) + 30]) for s, _ in ws]

    breaks = pace_breaks(kept, KEYS, list(range(len(KEYS))), skipped, transcribe, set(), char_pace(KEYS, 800))
    assert len(breaks) == 1 and breaks[0]["status"] == "jump"
    assert breaks[0]["from_s"] == 360 and breaks[0]["to_s"] == 480 and breaks[0]["jump_words"] == 230
    assert asked == [(390.0, 420.0), (420.0, 450.0), (450.0, 480.0)]  # only the skipped windows of the break


def test_a_pace_break_whose_windows_all_locate_is_resolved_and_one_with_silence_is_not():
    # the recitation is slower between 360 and 480 s; the skipped windows hold it
    def ws_at(t):
        if t <= 360:
            return t
        return 360 + (t - 360) // 3 if t <= 480 else 400 + (t - 480)

    kept = kept_every([(t, ws_at(t)) for t in (0, 120, 240, 360, 480, 600)], span=10)
    skipped = [(390.0, 420.0), (420.0, 450.0), (450.0, 480.0)]

    def transcribe(ws):
        return [" ".join(KEYS[ws_at(int(s)):ws_at(int(s)) + 10]) for s, _ in ws]

    breaks = pace_breaks(kept, KEYS, list(range(len(KEYS))), skipped, transcribe, set(), char_pace(KEYS, 800))
    assert [b["status"] for b in breaks] == ["resolved"]
    silent = pace_breaks(kept, KEYS, list(range(len(KEYS))), skipped, lambda ws: [""] * len(ws), set(),
                         char_pace(KEYS, 800))
    assert [b["status"] for b in silent] == ["unresolved"]


def test_a_jump_inside_a_refrain_is_not_a_jump():
    def ws_at(t):
        return t if t < 450 else t + 200

    kept = kept_every([(t, ws_at(t)) for t in (0, 120, 240, 360, 480)])
    skipped = [(390.0, 420.0), (420.0, 450.0), (450.0, 480.0)]
    aow = [w // 10 + 1 for w in range(len(KEYS))]

    def transcribe(ws):
        return [" ".join(KEYS[ws_at(int(s)):ws_at(int(s)) + 30]) for s, _ in ws]

    refrains = {aow[650]}
    breaks = pace_breaks(kept, KEYS, aow, skipped, transcribe, refrains, char_pace(KEYS, 800))
    assert breaks[0]["status"] != "jump"


def test_the_fail_safe_floor_is_one_checkpoint_per_full_600_s():
    assert required_checkpoints(599.9) == 0
    assert required_checkpoints(600.0) == 1
    assert required_checkpoints(1250.0) == 2


def placeholder_surah(per_ayah, seed=5):
    """PLACEHOLDER surah 1 (no basmala to decide): ayahs of random letter strings, and a vocab of their letters."""
    words = placeholder_words(sum(per_ayah), seed=seed, size=2)
    ayahs, i = {}, 0
    for a, k in enumerate(per_ayah, start=1):
        ayahs[(1, a)] = " ".join(words[i:i + k])
        i += k
    vocab = {"<pad>": 0}
    for ch in LETTERS:
        vocab[ch] = len(vocab)
    return ayahs, vocab, words


def placeholder_emissions(words, vocab, seconds_per_word=1.0, lead_s=1.0, tail_s=1.0, fps=50):
    fpw = round(seconds_per_word * fps)
    lead, tail = round(lead_s * fps), round(tail_s * fps)
    total = lead + len(words) * fpw + tail
    em = torch.full((total, len(vocab)), -20.0)
    em[:, 0] = 0.0
    starts = []
    for wi, w in enumerate(words):
        f = lead + wi * fpw
        starts.append(f)
        for k, ch in enumerate(w):
            em[f + 12 * k:f + 12 * k + 10, :] = -20.0
            em[f + 12 * k:f + 12 * k + 10, vocab[ch]] = 0.0
    return em, starts


def test_the_fail_safe_fires_below_one_checkpoint_per_600_s():
    ayahs, vocab, words = placeholder_surah([5] * 4)
    em, _ = placeholder_emissions(words, vocab, tail_s=640)  # 662 s of audio, no transcript at all
    with pytest.raises(AnchorsInsufficient, match="need 1"):
        anchored_align(em, 1, ayahs, vocab, 0, sec_per_frame=0.02, windows=[window(0, 30, [])], log=lambda m: None)


def test_an_unresolved_pace_break_fires_the_fail_safe(monkeypatch):
    ayahs, vocab, words = placeholder_surah([5] * 4)
    em, _ = placeholder_emissions(words, vocab)
    monkeypatch.setattr(cp, "pace_breaks", lambda *a, **k: [{"from_s": 0, "to_s": 9, "status": "unresolved"}])
    with pytest.raises(AnchorsInsufficient, match="unresolved pace break"):
        anchored_align(em, 1, ayahs, vocab, 0, sec_per_frame=0.02, windows=[], log=lambda m: None)


REPORT_KEYS = {"asr_model", "asr_revision", "every", "windows", "located", "repeats", "checkpoints", "cuts", "merges",
               "held_out", "held_out_words", "pace_breaks", "repeat_candidates", "last_located_ayah",
               "insufficient", "seconds"}


def test_anchored_align_cuts_at_checkpoints_and_reports_the_held_out_ones(monkeypatch):
    monkeypatch.setitem(PARAMS, "CUT_SPACING_S", 20)
    per_ayah = [6] * 12
    ayahs, vocab, words = placeholder_surah(per_ayah)
    em, starts = placeholder_emissions(words, vocab)  # 72 words, one per second, 1 s lead
    keys = words  # the placeholder words are their own normalised keys
    wins = [window(t, t + 30, keys[max(0, t - 1):t + 29]) for t in (0, 30, 60)]
    out, recited, report = anchored_align(em, 1, ayahs, vocab, 0, sec_per_frame=0.02, windows=wins,
                                          log=lambda m: None)
    assert recited is None
    assert set(report) == REPORT_KEYS and report["insufficient"] is None
    assert report["cuts"] and report["merges"] == []
    assert len(out) == len(words)
    for w, f in zip(out, starts):
        assert abs(w["start_ms"] - f * 20) <= 20  # within one frame
    first = {}
    for w in out:
        first.setdefault(w["ayah"], w["start_ms"])
    for ayah, cp_ms, final_ms in report["held_out"]:
        assert final_ms == first[ayah] and abs(cp_ms - final_ms) <= 20
    hw = report["held_out_words"]
    assert hw["n"] > 0 and hw["within_300ms"] == hw["n"]
    cut_ayahs = {a for a, _ in report["cuts"]}
    assert all(a not in cut_ayahs for a, _, _ in report["held_out"])

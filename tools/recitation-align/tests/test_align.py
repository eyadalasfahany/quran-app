"""Windowed forced alignment on synthetic emissions. No model download.

Each token has a clear peak of two frames at a known frame, with blank frames between tokens,
so the recovered word starts can be checked against the exact frame.
"""

import itertools

import pytest
import torch
import torchaudio.functional as F

from recitation_align.align import MAX_RETRIES, align_emissions, plan_windows

BLANK = 0
VOCAB = 5  # blank + tokens 1..4
TOKEN_CYCLE = itertools.cycle([1, 2, 3, 4])  # consecutive tokens always differ (no CTC repeat issue)


def synthetic(words: list[tuple[int, int]], pad: int = 0, gap: int = 3, width: int = 2):
    """words: (ayah, token count). Returns em, tokens, word_of_token, ayah_of_word, token starts."""
    tokens, word_of_token, ayah_of_word = [], [], []
    for wi, (ayah, n) in enumerate(words):
        ayah_of_word.append(ayah)
        for _ in range(n):
            tokens.append(next(TOKEN_CYCLE))
            word_of_token.append(wi)
    starts, f = [], 2
    for _ in tokens:
        starts.append(f)
        f += width + gap
    em = torch.full((f + 2 + pad, VOCAB), -10.0)
    em[:, BLANK] = 0.0
    for tok, s in zip(tokens, starts):
        em[s:s + width, BLANK] = -10.0
        em[s:s + width, tok] = 0.0
    return em, tokens, word_of_token, ayah_of_word, starts


def expected_word_starts(word_of_token: list[int], starts: list[int]) -> dict[int, int]:
    out: dict[int, int] = {}
    for ti, wi in enumerate(word_of_token):
        out.setdefault(wi, starts[ti])
    return out


def run_and_check(words, max_tokens, pad=0, **kwargs):
    em, tokens, wot, aow, starts = synthetic(words, pad=pad)
    trace: list = []
    agg = align_emissions(em, tokens, wot, aow, BLANK, max_tokens=max_tokens, trace=trace, **kwargs)
    expected = expected_word_starts(wot, starts)
    assert set(agg) == set(expected)
    for wi, exp in expected.items():
        assert abs(agg[wi]["start"] - exp) <= 1, (wi, agg[wi]["start"], exp)
    return agg, trace


WORDS = [(1, 2), (1, 3), (2, 1), (2, 4), (3, 2), (4, 3), (4, 1), (5, 2), (6, 3), (6, 2), (7, 4), (7, 1)]


# plan_windows

def test_windows_respect_max_tokens_and_overlap_one_ayah():
    counts = [5, 5, 5, 5, 5, 5]
    windows = plan_windows(counts, total_frames=10_000, max_tokens=12, lookahead_tokens=0)
    assert [w.commit for w in windows] == [(0, 2), (2, 4), (4, 6)]
    for w in windows:
        i, j = w.commit
        assert sum(counts[i:j]) <= 12
    for prev, nxt in zip(windows, windows[1:]):
        # the previous window aligns one look-ahead ayah, which is the next window's first committed ayah
        assert prev.aligned_end - nxt.commit[0] == 1
    assert windows[-1].last and windows[-1].aligned_end == 6
    assert not any(w.last for w in windows[:-1])


def test_look_ahead_ayah_is_the_next_commit_start():
    counts = [4, 4, 4, 4]
    windows = plan_windows(counts, total_frames=1_000, max_tokens=8, lookahead_tokens=0)
    assert [w.commit for w in windows] == [(0, 2), (2, 4)]
    assert windows[0].aligned_end == 3  # ayahs 0,1 plus look-ahead 2
    assert windows[0].tokens == 12
    assert windows[1].aligned_end == 4 and windows[1].last


def test_oversize_single_ayah_is_its_own_window():
    windows = plan_windows([3, 50, 3], total_frames=5_000, max_tokens=10, lookahead_tokens=0)
    assert [w.commit for w in windows] == [(0, 1), (1, 2), (2, 3)]
    assert windows[1].tokens == 53  # the oversize ayah is kept whole, plus its look-ahead


def test_single_window_when_everything_fits():
    windows = plan_windows([3, 3, 3], total_frames=1_000, max_tokens=100)
    assert len(windows) == 1 and windows[0].commit == (0, 3) and windows[0].last


def test_estimate_scales_with_tokens_and_has_slack():
    windows = plan_windows([10, 10], total_frames=400, max_tokens=10, lookahead_tokens=0)  # 20 tokens, 20 frames/token
    # first window aligns ayahs 0 and 1 (20 tokens): 20 * 20 * 2.0 + 500 frames
    assert windows[0].est_frames == 20 * 20 * 2 + 500


def test_plan_rejects_non_positive_max_tokens():
    with pytest.raises(ValueError):
        plan_windows([1], total_frames=10, max_tokens=0)


# align_emissions

def test_single_window_recovers_word_starts_within_one_frame():
    agg, trace = run_and_check(WORDS, max_tokens=10_000)
    assert len(trace) == 1


def test_many_windows_recover_word_starts_within_one_frame():
    _, trace = run_and_check(WORDS, max_tokens=6)
    assert len(trace) > 2


def test_padded_emissions_still_align():
    run_and_check(WORDS, max_tokens=6, pad=400)


def test_cursor_strictly_increases_and_windows_chain():
    _, trace = run_and_check(WORDS, max_tokens=6)
    cursors = [c for _, _, c, _ in trace]
    assert all(b > a for a, b in zip(cursors, cursors[1:]))
    assert trace[0][0] == 0 and trace[-1][1] == 7  # WORDS has seven ayahs
    assert all(b[0] == a[1] for a, b in zip(trace, trace[1:]))  # commit ranges chain


def test_each_window_logs_one_line(capsys):
    _, trace = run_and_check(WORDS, max_tokens=6)
    lines = [ln for ln in capsys.readouterr().err.splitlines() if ln.startswith("window ")]
    assert len(lines) == len(trace)


def test_retry_doubles_the_window_after_a_failure():
    calls: list[int] = []

    def flaky(log_probs, targets, blank):
        calls.append(log_probs.shape[1])
        if len(calls) == 1:
            raise RuntimeError("targets length is too long for CTC")
        return F.forced_align(log_probs, targets, blank=blank)

    agg, trace = run_and_check(WORDS, max_tokens=6, pad=2000, forced_align_fn=flaky, lookahead_tokens=0,
                               leading_star=False)
    assert len(calls) == len(trace) + 1  # exactly one retry
    assert calls[1] > calls[0]  # the retried window is longer than the failed one
    assert agg


def test_retry_gives_up_with_the_ayah_range():
    def always_fails(log_probs, targets, blank):
        raise RuntimeError("targets length is too long for CTC")

    em, tokens, wot, aow, _ = synthetic(WORDS, pad=2000)
    with pytest.raises(RuntimeError, match=r"ayahs 1-"):
        align_emissions(em, tokens, wot, aow, BLANK, max_tokens=6, forced_align_fn=always_fails, lookahead_tokens=0)


def test_retry_count_is_bounded():
    # 40 one-token ayahs: each window is small, so doubling does not reach the end of the file
    # before the retries run out.
    calls = []

    def always_fails(log_probs, targets, blank):
        calls.append(1)
        raise RuntimeError("too short")

    words = [(i + 1, 1) for i in range(40)]
    em, tokens, wot, aow, _ = synthetic(words, pad=10_000)
    with pytest.raises(RuntimeError, match=r"ayahs 1-"):
        align_emissions(em, tokens, wot, aow, BLANK, max_tokens=1, forced_align_fn=always_fails, lookahead_tokens=0)
    assert len(calls) == MAX_RETRIES + 1


def test_mismatched_token_counts_are_refused():
    em, tokens, wot, aow, _ = synthetic(WORDS)
    with pytest.raises(ValueError):
        align_emissions(em, tokens[:-1], wot, aow, BLANK)


def test_speech_outside_the_targets_does_not_stretch_earlier_windows():
    # Guard, not a reproduction: peaks after the last word belong to no target, and every
    # non-final window's audio contains them. Equal-score peaks do not show the stretch the
    # star prevents on real speech, so the 059 regression run is the real check.
    words = [(i + 1, 2) for i in range(12)]
    tokens, word_of_token, ayah_of_word = [], [], []
    for wi, (ayah, n) in enumerate(words):
        ayah_of_word.append(ayah)
        for _ in range(n):
            tokens.append(next(TOKEN_CYCLE))
            word_of_token.append(wi)
    hidden = [next(TOKEN_CYCLE) for _ in range(40)]  # 40 extra peaks, not in `tokens`
    all_ids = tokens + hidden
    starts, f = [], 2
    for _ in all_ids:
        starts.append(f)
        f += 5
    em = torch.full((f + 2, VOCAB), -10.0)
    em[:, BLANK] = 0.0
    for tok, s in zip(all_ids, starts):
        em[s:s + 2, BLANK] = -10.0
        em[s:s + 2, tok] = 0.0
    trace: list = []
    agg = align_emissions(em, tokens, word_of_token, ayah_of_word, BLANK, max_tokens=6, trace=trace,
                          leading_star=False)
    windows = plan_windows([2] * 12, em.shape[0], 6, lookahead_tokens=0)
    checked = 0
    expected = expected_word_starts(word_of_token, starts)
    for w in windows[:-1]:
        for wi in range(len(words)):
            if w.commit[0] <= ayah_of_word.index(words[wi][0]) < w.commit[1]:
                assert abs(agg[wi]["start"] - expected[wi]) <= 1, (wi, agg[wi]["start"], expected[wi])
                checked += 1
    assert checked > 0


# Trailing speech after the last real token (the star's job)

def trailing_speech_scenario(band_frames: int = 60, look_ahead_peak: float = -2.0, band_score: float = -3.0):
    """Committed ayahs 1-2 (strong peaks), look-ahead ayah 3 (two one-token words, weak peaks),
    then `band_frames` frames of speech that is not in the text: the look-ahead tokens score
    slightly better there than on their own peaks, and blank scores badly.

    Without a star, the look-ahead words can slide into that band (every band frame costs blank
    otherwise). With a star scoring 0 on every frame, the band costs nothing, so they stay put.
    """
    words = [(1, 2), (2, 2), (3, 1), (3, 1)]  # (ayah, tokens) per word; ayah 1 and 2 have two words
    tokens = [1, 2, 3, 4, 1, 2]
    word_of_token = [0, 0, 1, 1, 2, 3]
    ayah_of_word = [1, 1, 2, 2, 3, 3]
    starts = [2, 7, 12, 17, 22, 27]
    band_start = starts[-1] + 2 + 3
    em = torch.full((band_start + band_frames + 2, VOCAB), -10.0)
    em[:, BLANK] = 0.0
    em[band_start:band_start + band_frames, BLANK] = -10.0
    em[band_start:band_start + band_frames, 1:3] = band_score  # the look-ahead tokens (1 and 2)
    for k, (tok, s) in enumerate(zip(tokens, starts)):
        peak = look_ahead_peak if k >= 4 else 0.0
        em[s:s + 2, BLANK] = -10.0
        em[s:s + 2, tok] = peak
    return em, tokens, word_of_token, ayah_of_word, starts, words


@pytest.mark.parametrize("band_frames", [60, 400])
def test_trailing_speech_does_not_move_committed_words_with_chosen_settings(band_frames):
    # Committed ayahs 1-2 (words 0-1) and the first look-ahead word (2) stay within 1 frame of truth
    # with the default settings, even with a long surplus band (the premature-finish incentive).
    # Word 3 is covered by the penalty test below.
    em, tokens, wot, aow, starts, _ = trailing_speech_scenario(band_frames=band_frames)
    agg = align_emissions(em, tokens, wot, aow, BLANK, max_tokens=4)
    expected = expected_word_starts(wot, starts)
    assert set(agg) == set(expected)
    for wi in (0, 1, 2):
        assert abs(agg[wi]["start"] - expected[wi]) <= 1, (wi, agg[wi]["start"], expected[wi])


def test_without_star_penalty_trailing_speech_does_not_move_any_word():
    # Penalty 0 (star = best label): the whole scenario, including the final window's look-ahead word.
    em, tokens, wot, aow, starts, _ = trailing_speech_scenario()
    agg = align_emissions(em, tokens, wot, aow, BLANK, max_tokens=4, star_penalty=0.0)
    expected = expected_word_starts(wot, starts)
    for wi, exp in expected.items():
        assert abs(agg[wi]["start"] - exp) <= 1, (wi, agg[wi]["start"], exp)


def test_star_penalty_known_trade_off_moves_a_final_window_word_into_surplus():
    # Pinned, not desired: penalty 1 lets a real token score within 1 point of the best label beat
    # the star, so the last word slides 5 frames into the trailing band. Real Al-Baqarah 2:25 and
    # 2:26 need this penalty (see the grid in the change notes).
    em, tokens, wot, aow, starts, _ = trailing_speech_scenario()
    agg = align_emissions(em, tokens, wot, aow, BLANK, max_tokens=4, star_penalty=1.0)
    expected = expected_word_starts(wot, starts)
    assert agg[3]["start"] - expected[3] == 5


def test_every_window_ends_with_the_star_and_it_is_never_reported():
    seen_targets: list[list[int]] = []

    def spy(log_probs, targets, blank):
        seen_targets.append(targets[0].tolist())
        return F.forced_align(log_probs, targets, blank=blank)

    em, tokens, wot, aow, starts, _ = trailing_speech_scenario()
    agg = align_emissions(em, tokens, wot, aow, BLANK, max_tokens=4, forced_align_fn=spy)
    star_id = VOCAB  # the first star column; the first window also has a leading star at VOCAB
    assert len(seen_targets) == 2
    assert seen_targets[0][0] == VOCAB and seen_targets[0][-1] == VOCAB + 1  # leading and trailing
    assert seen_targets[1][-1] == star_id  # later windows: trailing star only
    for targets in seen_targets:
        assert all(t < VOCAB for t in targets[1:-1]) if targets[0] == VOCAB else all(t < VOCAB for t in targets[:-1])
    assert set(agg) == set(expected_word_starts(wot, starts))  # no star entries in the output

def test_leading_star_takes_speech_before_the_first_word():
    # Speech that is not in the text (isti'adha) fills frames 0-39 as peaks of token 3. Token 3 comes
    # after tokens 1 and 2 in the text, so it cannot take their place, and the leading star should.
    tokens = [1, 2, 3, 4]
    word_of_token = [0, 0, 1, 1]
    ayah_of_word = [1, 2]
    starts = [42, 47, 52, 57]
    em = torch.full((64, VOCAB), -10.0)
    em[:, BLANK] = 0.0
    for k in range(0, 40, 5):
        em[k:k + 2, BLANK] = -10.0
        em[k:k + 2, 3] = 0.0  # unrelated speech
    for tok, s0 in zip(tokens, starts):
        em[s0:s0 + 2, BLANK] = -10.0
        em[s0:s0 + 2, tok] = 0.0
    agg = align_emissions(em, tokens, word_of_token, ayah_of_word, BLANK, max_tokens=10_000, leading_star=True)
    assert abs(agg[0]["start"] - 42) <= 1
    assert all(agg[w]["start"] >= 40 for w in agg)  # no word starts inside the leading speech


def test_overlapping_chunks_keep_one_frame_per_20ms_without_gaps_or_repeats():
    from recitation_align.align import FRAME_SAMPLES, chunk_bounds

    sr = 16000
    n = int(95.3 * sr)  # not a multiple of the chunk size
    hop, ctx = 20 * sr, 5 * sr
    bounds = chunk_bounds(n, hop, ctx)
    kept = []
    for i, ws, we, f0, f1 in bounds:
        assert ws <= i and we >= min(n, i + hop) and ws >= 0 and we <= n
        # frame f0 starts at ws + f0*320, which is at or after the chunk start
        assert ws + f0 * FRAME_SAMPLES >= i
        kept.append((ws + f0 * FRAME_SAMPLES, ws + f1 * FRAME_SAMPLES))
    # the kept spans tile the whole file: each starts where the previous ended (within one frame)
    for (a0, a1), (b0, b1) in zip(kept, kept[1:]):
        assert abs(b0 - a1) <= FRAME_SAMPLES
    assert kept[0][0] == 0
    assert abs(kept[-1][1] - n) <= FRAME_SAMPLES

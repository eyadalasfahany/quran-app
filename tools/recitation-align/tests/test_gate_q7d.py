"""Q7d (plan way2quran-quality): the G3 tie-break, pace-adaptive G3 clips, verified elongations, low-confidence repeat
occurrences and the PR table's repair counts. PLACEHOLDER words of random Arabic letters only (no Quran text), faked
transcription and constructed emissions, as in `test_gate_verdicts.py`.
"""

import json
import random

import pytest
import torch

import test_gate_verdicts as V  # the synthetic recitation (World) and the record helpers
import test_report as TR
from test_gate_verdicts import positions  # noqa: F401  (the REPEAT_MODE "positions" fixture)
from recitation_align import gate
from recitation_align import report as R
from recitation_align.gate import BAD, OK, UNSURE, g3_post, local_text, match_start, surah_verdict, word_pace
from recitation_align.quality import PARAMS

SURAH = V.SURAH
LETTERS = V.LETTERS_W


def words_of(seed, k, size=4):
    rng = random.Random(seed)
    return ["".join(rng.choice(LETTERS) for _ in range(size)) for _ in range(k)]


# --- 1. the G3 tie-break ------------------------------------------------------------------------------------------

def identical_openings():
    """Ayahs 4 and 5 open with the same four PLACEHOLDER words; every other word is unique."""
    same = words_of(1, 4)
    ayahs = {(SURAH, a): " ".join(words_of(10 + a, 8)) for a in range(1, 9)}
    ayahs[(SURAH, 4)] = " ".join(same + words_of(20, 4))
    ayahs[(SURAH, 5)] = " ".join(same + words_of(21, 4))
    ayahs[(1, 1)] = "صصصص"
    return ayahs, same


def test_an_exact_tie_between_identical_openings_is_ok():
    ayahs, same = identical_openings()
    heard = " ".join(same)  # the clip hears only the shared opening
    for n in (4, 5):
        r = match_start(heard, local_text(SURAH, n, ayahs))
        assert r["verdict"] == OK and r["score"] == 100.0
    # at least one of the two lands on the other ayah first, and the tie-break is what makes it OK
    assert any(match_start(heard, local_text(SURAH, n, ayahs)).get("tie") for n in (4, 5))


def test_a_shift_between_identical_openings_is_still_caught_by_the_unique_neighbour():
    """The aligner put ayah 4's start on ayah 5's audio and 5's start on 6's: the tie lets 4 pass, but 5's clip hears
    6's unique opening, so the surah still fails G3."""
    ayahs, same = identical_openings()
    four = match_start(" ".join(same), local_text(SURAH, 4, ayahs))
    five = match_start(" ".join(ayahs[(SURAH, 6)].split()[:5]), local_text(SURAH, 5, ayahs))
    assert four["verdict"] == OK and five["verdict"] == BAD and five["heard"] == "6:0"
    results = {a: {"verdict": OK, "heard": f"{a}:0", "score": 100.0} for a in range(2, 9)}
    results[4], results[5] = four, five
    rec = V.valid(V.verdict(V.make_words(n_ayahs=8), g3_results=results, c=V.comp(ayah_count=8)))
    assert rec["verdict"] == "no_highlight" and rec["checks"]["G3"]["failed"] == [5]


def test_the_tie_break_never_passes_a_clip_that_matches_better_elsewhere():
    ayahs, same = identical_openings()
    heard = " ".join(same + ayahs[(SURAH, 5)].split()[4:6])  # the shared opening, then 5's own words
    r = match_start(heard, local_text(SURAH, 4, ayahs))
    assert r["verdict"] == BAD and r["heard"] == "5:0" and not r.get("tie")


# --- 2. pace-adaptive G3 clips ----------------------------------------------------------------------------------------

def paced_words(gap_ms, n_ayahs=6, per=6):
    out, t = [], 0
    for a in range(1, n_ayahs + 1):
        for p in range(1, per + 1):
            out.append({"surah": SURAH, "ayah": a, "position": p, "word": "بتثج", "start_ms": t, "end_ms": t + 300,
                        "confidence": 0.9})
            t += gap_ms
        t += 2000
    return out


def test_a_fast_recitation_keeps_the_fixed_clip_and_a_slow_one_gets_about_five_words():
    assert word_pace(paced_words(800)) == pytest.approx(0.8)
    assert g3_post(paced_words(800)) == PARAMS["G3_POST_S"]  # 5 x 0.8 s = 4 s < 4.8 s: unchanged
    assert g3_post(paced_words(1400)) == pytest.approx(5 * 1.4 - PARAMS["G3_PRE_S"])  # the pauses between ayahs do not count
    assert g3_post(paced_words(4000)) == pytest.approx(PARAMS["G3_MAX_S"] - PARAMS["G3_PRE_S"])  # capped


def test_the_probe_clips_use_the_surah_pace_and_the_same_pre_rolls():
    words = paced_words(1400)
    ayahs = {(SURAH, a): " ".join(words_of(a, 6)) for a in range(1, 7)}
    seen = []

    def hear(wav, clips, batch=1):
        seen.extend(clips)
        return {"clips": [{"start_s": s, "end_s": e, "text": ""} for s, e in clips], "seconds": 0.0}

    gate.probe_ayah_starts(None, words, SURAH, ayahs, hear)
    post = g3_post(words)
    starts = gate.ayah_starts(words)
    assert (round(starts[2] - PARAMS["G3_PRE_S"], 3), round(starts[2] + post, 3)) in [(round(a, 3), round(b, 3))
                                                                                      for a, b in seen]
    pres = {round(starts[2] - s, 3) for s, e in seen if abs(e - starts[2] - post) < 1e-6}
    assert pres == {PARAMS["G3_PRE_S"], *PARAMS["G3_REPROBE"]}  # the empty text is re-probed at the same length


# --- 3. verified elongations -----------------------------------------------------------------------------------------

class ElongWorld(V.World):
    """A World whose word (ayah, position) `long` holds each letter for `hold` frames (an elongation)."""

    def __init__(self, ayahs, order, long, hold=40):
        self.ayahs = ayahs
        frames = [0] * 50
        self.occ = []
        for k, (a, p) in enumerate(order):
            word = ayahs[(SURAH, a)].split()[p - 1]
            onset = len(frames)
            for ch in word:
                frames += [V.VOCAB[ch]] * (hold if (a, p) == long else 5)
            end = len(frames)
            frames += [0] * 2
            nxt = order[k + 1] if k + 1 < len(order) else None
            if nxt is None or nxt[0] != a:
                frames += [0] * 25
            self.occ.append((a, p, word, round(onset * V.SPF * 1000), round(end * V.SPF * 1000)))
        frames += [0] * 150
        self.em = torch.full((len(frames), len(V.VOCAB) + 1), -12.0)
        for f, t in enumerate(frames):
            self.em[f, t] = 0.0
        self.wav = V.np.zeros(len(frames) * 320, dtype=V.np.float32)
        self.duration_ms = round(len(frames) * V.SPF * 1000)
        self.garble = set()
        self.span_text = None  # what dense ASR hears over the elongated span (None: the true words)

    def dense(self, windows):
        out = super().dense(windows)
        if self.span_text is not None:
            w = self.first(*self.long)
            out = [self.span_text if abs(s * 1000 - w[3]) < 1 and abs(e * 1000 - w[4]) < 1 else t
                   for (s, e), t in zip(windows, out)]
        return out


def elong_world():
    ayahs = V.world_ayahs()
    world = ElongWorld(ayahs, V.order_of(ayahs), long=(4, 5))
    world.long = (4, 5)
    return world


def test_a_stretched_word_heard_as_itself_with_ok_starts_is_a_verified_elongation(positions):
    world = elong_world()
    rec, doc = V.gate_world(world, V.plain_words(world), n_ayahs=8)
    stretch = rec["checks"]["stretch"]
    assert [k for k, _, _ in stretch["words"]] == [f"{SURAH}:4"]
    assert [e[:2] for e in stretch["elongations"]] == [[f"{SURAH}:4", 5]] and stretch["elongations"][0][3] >= 85
    assert rec["verdict"] == "pass" and rec["checks"]["triggers"]["stretch"] == []
    assert not any(r["accepted"] for r in rec["repairs"])  # an elongation is not a repair


def test_a_stretched_span_that_holds_another_word_stays_a_failure(positions):
    world = elong_world()
    world.span_text = " ".join([world.first(4, 5)[2], world.ayahs[(SURAH, 5)].split()[2]])  # it and a word of 5
    rec, _ = V.gate_world(world, V.plain_words(world), n_ayahs=8)
    assert rec["checks"]["stretch"]["elongations"] == []
    assert rec["verdict"] == "no_highlight" and rec["checks"]["triggers"]["stretch"] == [f"{SURAH}:4"]


def test_an_elongation_needs_ok_starts_on_both_sides(positions):
    world = elong_world()
    words = V.plain_words(world)
    w = world.first(4, 5)
    ctx = gate.RepairContext(surah=SURAH, ayahs=world.ayahs, wav=world.wav, em=world.em, vocab=V.VOCAB, blank=0,
                             spf=V.SPF, transcribe_clips=world, dense=world.dense, completeness=V.comp(ayah_count=8),
                             duration_s=world.duration_ms / 1000)
    ok = {a: {"verdict": OK} for a in range(2, 9)}
    dur = w[4] - w[3]
    assert gate.verify_elongation(ctx, words, f"{SURAH}:4", 5, dur, ok, None) is not None
    assert gate.verify_elongation(ctx, words, f"{SURAH}:4", 5, dur, {**ok, 5: {"verdict": BAD}}, None) is None
    assert gate.verify_elongation(ctx, words, f"{SURAH}:4", 5, dur, {**ok, 4: {"verdict": UNSURE}}, None) is None
    world.span_text = ""
    assert gate.verify_elongation(ctx, words, f"{SURAH}:4", 5, dur, ok, None) is None  # nothing heard


# --- 4. low-confidence occurrences in an accepted repeat ---------------------------------------------------------------

def test_a_repeat_pass_below_the_floor_makes_its_ayah_segments_null():
    from recitation_align import repeats as rp

    new = [{"ayah": 4, "position": p, "confidence": 0.9} for p in (1, 2, 3, 2, 3)]
    new += [{"ayah": 5, "position": 1, "confidence": 0.1}]  # low, but not a repeated position
    assert gate._outcome(rp, SURAH, [0, 1, 2, 1, 2, 3], [4, 4, 4, 5], "positions", new) == ([], [])
    new[3]["confidence"] = PARAMS["FLOOR"] - 0.01  # the second pass of 4:2
    assert gate._outcome(rp, SURAH, [0, 1, 2, 1, 2, 3], [4, 4, 4, 5], "positions", new) == ([4], [])


def test_low_confidence_nulls_count_in_the_null_share():
    words = V.make_words()
    attempt = [{"region": [f"{SURAH}:3", f"{SURAH}:5"], "accepted": True}]
    rec = V.valid(V.verdict(words, repairs=attempt, repair_null=[4]))
    assert rec["verdict"] == "repaired" and rec["segments_null"] == [4]
    rec = V.valid(V.verdict(words, repairs=attempt, repair_null=list(range(2, 7))))  # 5 of 30 > 10 %
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["segments-null-share"]


# --- 5. the PR table ------------------------------------------------------------------------------------------------

def test_the_pr_table_counts_accepted_repairs_and_attempts_apart(tmp_path):
    base = tmp_path / "handoff"
    for sub in ("completeness", "gate", "refused"):
        (base / sub).mkdir(parents=True)
    c = TR.completeness(5, ayah_count=30, verdict="complete", stored=False)
    c["tool_version"] = V.tool_version()
    (base / "completeness" / "005.json").write_text(json.dumps(c), encoding="utf-8")
    attempts = [{"region": ["5:2", "5:4"], "accepted": True}, {"region": ["5:8", "5:10"], "accepted": False},
                {"region": ["5:8", "5:9"], "accepted": False}]
    rec = surah_verdict(5, c, words=V.make_words(surah=5), anchors=V.anchors_for(V.make_words(surah=5)),
                        g2=V.good_g2(), g3={"results": V.ok_results(), "unprobed": [], "moved": {}}, repairs=attempts)
    (base / "gate" / "005.json").write_text(json.dumps(rec), encoding="utf-8")
    report = R.merge_reciter_report(base, {"reciter_id": 3, "files": {"5": "005.mp3"}}, "run-1")
    md = R.pr_markdown(report)
    assert "| Repairs | Attempts |" in md
    row = next(line for line in md.splitlines() if line.startswith("| 5 | repaired"))
    assert row.split(" | ")[6:8] == ["1", "3"]


# --- the long last-word clip (G2 and the end repair) ------------------------------------------------------------------

class WholeWordWorld(ElongWorld):
    """A clip hears a word only when it holds the whole word (an elongated word cut off by the clip is not heard)."""

    def __call__(self, wav, clips, batch=1):
        out = []
        for s, e in clips:
            heard = [o for o in self.occ if s * 1000 - 50 <= o[3] and o[4] <= e * 1000]
            out.append({"start_s": s, "end_s": e, "text": " ".join(o[2] for o in heard)})
        return {"clips": out, "seconds": 0.0}


def end_check(world, words):
    c = V.comp(ayah_count=8)
    return gate.end_coverage(world.wav, words, SURAH, world.ayahs, world, {}, c, world.duration_ms / 1000)


def test_an_elongated_last_word_passes_g2_on_the_long_clip_and_an_early_start_still_fails():
    ayahs = V.world_ayahs()
    world = WholeWordWorld(ayahs, V.order_of(ayahs), long=(8, 10), hold=30)  # the last word lasts 2.4 s
    world.long = (8, 10)
    g2 = end_check(world, V.plain_words(world))
    assert g2["last_word"] == OK and g2["last_word_clip"] == "long" and g2["status"] == "pass"
    w9, w10 = world.first(8, 9), world.first(8, 10)
    early = V.plain_words(world, override={(8, 9): (w9[3], w9[3] + 100), (8, 10): (w9[3] + 100, w10[4])})
    g2 = end_check(world, early)  # the last word placed on the word before it
    assert g2["last_word"] != OK and g2["status"] == "fail"


def test_a_short_last_word_never_needs_the_long_clip():
    ayahs = V.world_ayahs()
    world = WholeWordWorld(ayahs, V.order_of(ayahs), long=None)
    g2 = end_check(world, V.plain_words(world))
    assert g2["last_word"] == OK and "last_word_clip" not in g2 and g2["clips"] == 2  # last ayah + last word


def test_the_stepped_search_tries_the_half_step_grid_when_the_coarse_one_fails():
    """The 62:017 tail pattern: the target is heard cleanly only between two coarse steps. The half-shifted grid is
    probed after the coarse one, and the threshold is unchanged: a target never heard at STEP_SCORE is never found."""
    t0, seen = 100.0, []

    def judge(ts, clean=100.75):
        seen.extend(ts)
        return [(t, abs(t - clean) < 0.3, 100.0 if abs(t - clean) < 1e-6 else 80.0) for t in ts]

    found = gate._stepped(t0, gate._steps(1), 0.1, judge, 1)
    assert found == (pytest.approx(100.75), 100.0)
    coarse = len(gate._steps(1))
    assert seen[:coarse] == [pytest.approx(t0 + d) for d in gate._steps(1)]  # the coarse grid first, all of it
    assert seen[coarse] == pytest.approx(t0 + 0.25)  # then the half-shifted grid
    assert gate._stepped(t0, gate._steps(0), 0.1, lambda ts: [(t, True, 80.0) for t in ts], 1) is None

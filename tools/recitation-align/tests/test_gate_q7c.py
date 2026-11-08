"""Q7c (plan way2quran-quality): a stretched word over a repeat the repeat stage could not represent makes its ayah
`segments_null` (when the G3 starts on both sides are OK) instead of failing the surah. PLACEHOLDER words of random
Arabic letters only; faked transcription and constructed emissions, as in `test_gate_verdicts.py`."""

import dataclasses

import test_gate_q7d as D
import test_gate_verdicts as V
from recitation_align import gate
from recitation_align.gate import BAD, OK

SURAH = V.SURAH


def short_repeat_world(n_ayahs=40):
    """4:5 is long, and the word 4:3 is recited again right after it, inside 4:5's aligned span."""
    ayahs = V.world_ayahs(n_ayahs)
    order = V.order_of(ayahs, ((4, 5), [(4, 3)]))
    world = D.ElongWorld(ayahs, order, long=(4, 5))
    world.long = (4, 5)
    again = world.first(4, 3, 1)
    words = V.plain_words(world, override={(4, 5): (world.first(4, 5)[3], again[4])})
    return world, words


def test_a_stretch_over_an_unrepresented_repeat_nulls_its_ayah_and_the_surah_still_ships():
    world, words = short_repeat_world()
    rec, _ = V.gate_world(world, words, n_ayahs=40)
    stretch = rec["checks"]["stretch"]
    assert [u[:2] for u in stretch["unresolved_repeats"]] == [[f"{SURAH}:4", 5]]
    assert stretch["elongations"] == [] and rec["checks"]["triggers"]["stretch"] == []
    assert rec["verdict"] == "pass" and rec["segments_null"] == [4]


def test_it_counts_in_the_null_share():
    world, words = short_repeat_world(n_ayahs=8)  # 1 of 8 ayahs nulled is above NULL_SHARE
    rec, _ = V.gate_world(world, words, n_ayahs=8)
    assert rec["verdict"] == "no_highlight" and rec["reasons"] == ["segments-null-share"]


def test_an_unresolved_repeat_needs_ok_starts_on_both_sides_and_an_earlier_word_heard():
    world, words = short_repeat_world()
    ctx = gate.RepairContext(surah=SURAH, ayahs=world.ayahs, wav=world.wav, em=world.em, vocab=V.VOCAB, blank=0,
                             spf=V.SPF, transcribe_clips=world, dense=world.dense, completeness=V.comp(ayah_count=40),
                             duration_s=world.duration_ms / 1000)
    w = next(x for x in words if x["ayah"] == 4 and x["position"] == 5)
    dur = w["end_ms"] - w["start_ms"]
    ok = {a: {"verdict": OK} for a in range(2, 41)}
    assert gate.unresolved_repeat(ctx, words, f"{SURAH}:4", 5, dur, ok, None)["earlier"] == 1
    assert gate.unresolved_repeat(ctx, words, f"{SURAH}:4", 5, dur, {**ok, 5: {"verdict": BAD}}, None) is None
    assert gate.unresolved_repeat(ctx, words, f"{SURAH}:4", 5, dur, {**ok, 4: {"verdict": BAD}}, None) is None
    following = dataclasses.replace(ctx, dense=lambda ws: [" ".join([w["word"], world.first(4, 6)[2]])])
    assert gate.unresolved_repeat(following, words, f"{SURAH}:4", 5, dur, ok, None) is None  # not a repeat

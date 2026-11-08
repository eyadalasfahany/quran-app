"""Q7e (plan way2quran-quality): the word-onset repair of a squeezed-late stretch, and direct G3 probes for ayah starts
the cut-avoid rule moved off. PLACEHOLDER words of random Arabic letters only (no Quran text); the transcription is
faked and the emissions are constructed, as in `test_gate_verdicts.py`.
"""

import pytest

import test_gate_verdicts as V
from test_gate_verdicts import positions  # noqa: F401  (the REPEAT_MODE "positions" fixture)
from recitation_align import gate
from recitation_align.gate import OK, PARAMS

SURAH = V.SURAH


def squeezed(world, words_from, n=4, k=5, last=12):
    """Word n:k runs over the audio of n:k+1 .. n:last, which are squeezed into the 0.1 s slots just before n:last+1.
    `words_from` gives the first-pass entries for every other word."""
    nxt = world.first(n, last + 1)[3]
    over = {(n, k): (world.first(n, k)[3], nxt - 100 * (last - k))}
    for i, p in enumerate(range(k + 1, last + 1)):
        s = nxt - 100 * (last - k) + 100 * i
        over[(n, p)] = (s, s + 100)
    return words_from(world, override=over)


def test_a_squeezed_late_stretch_is_fixed_by_the_word_onset_repair(positions):
    ayahs = V.world_ayahs(per=16)
    world = V.World(ayahs, V.order_of(ayahs))
    words = squeezed(world, V.plain_words)
    assert [k for k, _, _ in gate.stretched_words(words, gate.surah_pace(words))] == [f"{SURAH}:4"]
    rec, doc = V.gate_world(world, words, n_ayahs=8)
    assert rec["verdict"] == "repaired" and rec["checks"]["triggers"]["stretch"] == []
    onset = [r for r in rec["repairs"] if r["kind"] == "onset" and r["accepted"]]
    assert len(onset) == 1 and onset[0]["word"] == "4:5" and onset[0]["following"] >= 1
    six = next(w for w in doc["words"] if w["ayah"] == 4 and w["position"] == 6)
    assert abs(six["start_ms"] - world.first(4, 6)[3]) <= 40 and onset[0]["after_start_ms"] == six["start_ms"]
    # every word of the ayah back within 80 ms of its true onset (a constructed letter shared by two neighbouring
    # words can move a boundary by a few frames)
    assert all(abs(w["start_ms"] - world.first(4, w["position"])[3]) <= 80 for w in doc["words"] if w["ayah"] == 4)


def test_a_stretch_whose_span_holds_no_following_word_gets_no_onset_repair(positions):
    """An elongation (the span hears the word itself) is not the squeezed pattern: no onset repair is tried."""
    import test_gate_q7d as D

    world = D.elong_world()
    rec, _ = V.gate_world(world, V.plain_words(world), n_ayahs=8)
    assert not any(r["kind"] == "onset" for r in rec["repairs"])
    assert rec["verdict"] == "pass" and rec["checks"]["stretch"]["elongations"]


def test_the_onset_repair_keeps_the_occurrences_of_an_ayah_with_a_repeat(positions):
    """Ayah 4 holds a repeat (already represented as occurrences) after a squeezed-late stretch. The onset repair
    re-aligns only the stretched word and the squeezed ones, and the occurrences stay as they were."""
    ayahs = V.world_ayahs(per=16)
    order = V.order_of(ayahs, ((4, 14), [(4, 13), (4, 14)]))  # 4:13-4:14 recited twice, after the squeezed block
    world = V.World(ayahs, order)

    def with_occurrences(world, override=None):
        out, seen = [], {}
        for a, p, word, onset, end in world.occ:
            seen[(a, p)] = seen.get((a, p), 0) + 1
            s, e = (override or {}).get((a, p), (onset, end)) if seen[(a, p)] == 1 else (onset, end)
            out.append({"surah": SURAH, "ayah": a, "position": p, "word": word, "start_ms": s, "end_ms": e,
                        "confidence": 0.9, **({"occurrence": seen[(a, p)]} if a == 4 else {})})
        return sorted(out, key=lambda w: (w["ayah"], w["start_ms"]))

    words = squeezed(world, with_occurrences)
    ctx = gate.RepairContext(surah=SURAH, ayahs=ayahs, wav=world.wav, em=world.em, vocab=V.VOCAB, blank=0, spf=V.SPF,
                             transcribe_clips=world, dense=world.dense, completeness=V.comp(ayah_count=8),
                             duration_s=world.duration_ms / 1000, usable=set(range(1, 9)), pace=gate.surah_pace(words))
    (k, p, dur), = [x for x in gate.stretched_words(words, ctx.pace)]
    raw = {a: {"verdict": OK, "heard": f"{a}:0", "score": 100.0} for a in range(2, 9)}
    r = gate.repair_onset(ctx, words, k, p, dur, raw, None)
    assert r["entry"]["accepted"], r["entry"]
    four = [w for w in r["words"] if w["ayah"] == 4]
    assert [(w["position"], w["occurrence"]) for w in four[12:16]] == [(13, 1), (14, 1), (13, 2), (14, 2)]
    assert all("occurrence" in w for w in four) and len(four) == 18
    assert not [x for x in gate.stretched_words(r["words"], ctx.pace)]


def test_the_onset_repair_is_refused_when_no_clip_hears_the_following_word_at_step_score(positions):
    ayahs = V.world_ayahs(per=16)
    world = V.World(ayahs, V.order_of(ayahs))
    world.garble.add((4, 6))  # every clip that begins on 4:6 is heard as noise
    rec, doc = V.gate_world(world, squeezed(world, V.plain_words), n_ayahs=8)
    onset = [r for r in rec["repairs"] if r["kind"] == "onset"]
    assert onset and not any(r["accepted"] for r in onset) and onset[0]["failed"] == ["no-step-found"]
    assert rec["verdict"] == "no_highlight"


# --- direct probes for ayah starts moved off a cut ---------------------------------------------------------------------

def test_an_ayah_start_moved_off_a_cut_gets_its_own_direct_probe_in_the_repair_path(positions):
    ayahs = V.world_ayahs()
    world = V.World(ayahs, V.order_of(ayahs))
    words = V.plain_words(world)
    cut = world.first(5, 1)[3] + 500  # within G3_CUT_AVOID_S of ayah 5's start: its probe moves to 6
    world.garble.add((3, 1))  # something else needs repair, so the repair path runs
    doc_extra = {"anchors": {"cuts": [[5, cut]], "pace_breaks": [], "held_out": [], "held_out_refs": []}}
    rec, _ = V.gate_world(world, words, n_ayahs=8, doc_extra=doc_extra)
    assert rec["checks"]["G3"]["moved"] == {"5": 6}
    assert rec["checks"]["G3"]["n"] == 7  # ayahs 2..8 each with a probe of its own: 5 directly
    assert 5 not in rec["checks"]["G3"]["failed"]


def test_direct_probes_only_fill_the_starts_that_have_none():
    ayahs = V.world_ayahs()
    world = V.World(ayahs, V.order_of(ayahs))
    words = V.plain_words(world)
    ctx = gate.RepairContext(surah=SURAH, ayahs=ayahs, wav=world.wav, em=world.em, vocab=V.VOCAB, blank=0, spf=V.SPF,
                             transcribe_clips=world, dense=world.dense, completeness=V.comp(ayah_count=8),
                             duration_s=world.duration_ms / 1000)
    raw = {6: {"verdict": OK}}
    got = gate._direct_probes(ctx, words, [1, 5, 6, 9], raw)
    assert set(got) == {5} and got[5]["direct"] is True and got[5]["verdict"] == OK
    assert PARAMS["G3_CUT_AVOID_S"] == 3  # the rule that moves a probe is unchanged


def test_a_following_word_that_was_not_late_is_refused_as_not_squeezed(positions):
    """A long word over which the span's ASR runs on into the next words, while those words are already in place:
    not the squeezed pattern, so nothing is re-aligned and the stretched word keeps its timing."""
    import test_gate_q7d as D

    world = D.elong_world()  # 4:5 is elongated; 4:6 onwards are where they belong
    w5, w6 = world.first(4, 5), world.first(4, 6)
    world.span_text = " ".join([w5[2], w6[2], world.first(4, 7)[2]])  # the span is heard running on
    words = V.plain_words(world)
    ctx = gate.RepairContext(surah=SURAH, ayahs=world.ayahs, wav=world.wav, em=world.em, vocab=V.VOCAB, blank=0,
                             spf=V.SPF, transcribe_clips=world, dense=world.dense, completeness=V.comp(ayah_count=8),
                             duration_s=world.duration_ms / 1000, usable=set(range(1, 9)), pace=gate.surah_pace(words))
    raw = {a: {"verdict": OK, "heard": f"{a}:0", "score": 100.0} for a in range(2, 9)}
    r = gate.repair_onset(ctx, words, f"{SURAH}:4", 5, w5[4] - w5[3], raw, None)
    assert r is not None and r["words"] is None and r["entry"]["failed"] in (["not-squeezed"], ["no-step-found"])

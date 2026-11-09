"""recitation_check.py and qf_ref_fetch.py without models or network: the plan, the masks, the merges and the pack
reader, on synthetic data (positions and times only)."""

import importlib.util
import json
import sqlite3
from pathlib import Path

import pytest

TOOL = Path(__file__).resolve().parents[1]


def _load(name):
    spec = importlib.util.spec_from_file_location(name, TOOL / "scripts" / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rc = _load("recitation_check")
qf = _load("qf_ref_fetch")


def test_the_plan_has_one_job_per_surah_or_reciter():
    assert rc.plan("repeat-calibration") == [{"surah": n} for n in (1, 2, 18, 36, 59)]
    assert rc.plan("afasy-pipeline") == rc.plan("repeat-calibration")
    ws = rc.plan("word-start")
    assert len(ws) == 12 and {j["reciter"] for j in ws} == {"afasy", "husary", "sudais", "minshawi"}
    real = rc.plan("real-check")
    assert [(j["reciter"], j["surah"]) for j in real] == [(1, 5), (1, 9), (3, 18), (3, 15), (2, 36), (2, 18), (62, 17)]
    assert [j for j in real if j.get("compare_base")] == [real[3]]
    assert all(len(j["sha256"]) == 64 for j in real if j["source"] == "way2quran")
    assert (TOOL.parents[1] / real[6]["timing"]).is_file()


def test_the_mask_drops_versions_digests_and_seconds_at_every_level():
    a = {"tool_version": "x", "verdict": "pass", "checks": {"G2": {"seconds": 1.2, "ok": 3}}, "seconds": {"g3": 9}}
    b = {"tool_version": "y", "verdict": "pass", "checks": {"G2": {"seconds": 0.6, "ok": 3}}}
    assert rc.differences(rc.masked(a), rc.masked(b)) == []
    b["checks"]["G2"]["ok"] = 4
    assert rc.differences(rc.masked(a), rc.masked(b)) == [".checks.G2.ok"]
    assert rc.differences([1, 2], [1, 2, 3]) == ["."]


def test_the_shift_must_be_a_whole_number(capsys):
    with pytest.raises(SystemExit):
        rc.main(["plan", "--check", "word-start", "--shift-ms", "1; rm -rf /"])
    assert rc.main(["plan", "--check", "word-start", "--shift-ms", "-80"]) == 0
    assert len(json.loads(capsys.readouterr().out)) == 12


def test_merge_pools_the_lit_word_counts_of_the_afasy_jobs():
    jobs = [{"item": {"surah": 1}, "verdict": "pass", "audio_s": 10, "seconds": {"gate": 5}, "rtf": {"total": 0.5},
             "lit": {"0": {"repeat": [0, 8, 2], "plain": [0, 9, 1]}}},
            {"item": {"surah": 18}, "verdict": "no_highlight", "audio_s": 10, "seconds": {}, "rtf": None,
             "lit": {"0": {"repeat": [10, 0, 0], "plain": [0, 10, 0]}}}]
    out = rc.merge("afasy-pipeline", jobs)
    assert out["lit"]["0"]["repeat"] == {"samples": 20, "nulled": 0.5, "agrees": 0.4, "wrong": 0.1}
    assert out["lit"]["0"]["plain"]["wrong"] == 0.05
    assert "| pass |" in rc.markdown(out)


def test_merge_pools_word_starts_per_reciter_over_the_non_repeat_ayahs():
    jobs = [{"item": {"reciter": "husary", "surah": 18}, "start_errors": [100, 120],
             "lit": {"0": {"repeat": [0, 0, 50], "plain": [0, 8, 2]}, "-80": {"repeat": [0, 0, 50], "plain": [0, 10, 0]}}},
            {"item": {"reciter": "husary", "surah": 36}, "start_errors": [80],
             "lit": {"0": {"repeat": [0, 0, 0], "plain": [0, 6, 4]}, "-80": {"repeat": [0, 0, 0], "plain": [0, 9, 1]}}},
            {"item": {"reciter": "sudais", "surah": 18}, "aligned": False}]
    out = rc.merge("word-start", jobs)["reciters"]
    assert out["husary"]["start"]["median"] == 100 and out["husary"]["lit_wrong"] == {"0": 0.3, "-80": 0.05}
    assert out["sudais"] == {"start": None, "lit_wrong": {}}


def _pack(path: Path):
    db = sqlite3.connect(path)
    db.execute("create table chapter_audio_files (id integer, recitation_id integer, chapter_id integer, "
               "audio_url text, size_bytes integer, duration_ms integer, format text)")
    db.execute("create table recitation_timings (audio_file_id integer, verse_id integer, start_ms integer, "
               "end_ms integer, segments text)")
    db.execute("insert into chapter_audio_files values (7, 1, 2, 'https://example.invalid/2.mp3', 1, 1, 'mp3')")
    db.execute("insert into recitation_timings values (7, 9, 0, 900, '[[1, 0, 400], [2, 400, 900]]')")
    db.execute("insert into recitation_timings values (7, 8, 0, 0, null)")
    db.commit()
    return db


def test_the_pack_reader_writes_the_export_qf_shape_in_verse_order(tmp_path):
    db = _pack(tmp_path / "p.sqlite")
    url, refs = qf.refs_from_pack(db, 2, {8: (2, 1), 9: (2, 2)})
    assert url == "https://example.invalid/2.mp3"
    assert refs == [{"ayah": 1, "start_ms": 0, "end_ms": 0, "words": []},
                    {"ayah": 2, "start_ms": 0, "end_ms": 900, "words": [{"index": 1, "start_ms": 0, "end_ms": 400},
                                                                        {"index": 2, "start_ms": 400, "end_ms": 900}]}]
    with pytest.raises(SystemExit):
        qf.refs_from_pack(db, 3, {})
    with pytest.raises(SystemExit):
        qf.refs_from_pack(db, 2, {8: (3, 1), 9: (2, 2)})  # a row of another surah


def test_the_pack_entry_must_be_a_chapter_recitation():
    manifest = {"resources": [{"id": 4, "group": "chapter_recitations", "pack": {}},
                              {"id": 31, "group": "azkar", "pack": {}}]}
    assert qf.pack_entry(manifest, 4)["id"] == 4
    with pytest.raises(SystemExit):
        qf.pack_entry(manifest, 31)


def test_the_mask_covers_the_anchor_seconds_of_an_aligned_document():
    a = {"tool_version": "0.1.0+q7", "anchors": {"seconds": {"asr": 480.1}, "windows": 7}, "words": [[1, 0, 400]]}
    b = {"tool_version": "0.1.0+q6", "anchors": {"seconds": {"asr": 470.0}, "windows": 7}, "words": [[1, 0, 400]]}
    assert rc.differences(rc.masked(a), rc.masked(b)) == []


def test_the_summary_shows_each_gate_stage_rtf():
    out = rc.merge("real-check", [{"item": {"reciter": 1, "surah": 5}, "verdict": "repaired", "audio_s": 100,
                                   "seconds": {"gate": 90}, "rtf": {"total": 0.9},
                                   "gate_rtf": {"g3": 0.5, "repair": 0.3}, "identical_to_base": None}])
    assert out["jobs"][0]["gate_rtf"] == {"g3": 0.5, "repair": 0.3}
    assert '"repair": 0.3' in rc.markdown(out)


def test_g5_against_qf_tells_which_side_qf_agrees_with():
    refs = [{"ayah": 1, "start_ms": 0, "end_ms": 9000,
             "words": [{"index": 1, "start_ms": 1000, "end_ms": 1500}, {"index": 2, "start_ms": 2000, "end_ms": 2500},
                       {"index": 3, "start_ms": 3000, "end_ms": 3500}]}]
    held = [[1, 1, 1000, 1100],   # close: not counted as far
            [1, 2, 2600, 2000],   # far from the checkpoint, ours right by QF, checkpoint off
            [1, 3, 3000, 3700],   # far, ours wrong by QF
            [2, 1, 0, 900]]       # no QF word: skipped
    assert rc.g5_vs_qf(held, refs) == {"n": 3, "ours_far_from_checkpoint": 2, "of_which_ours_right_by_qf": 1,
                                       "of_which_ours_wrong_by_qf": 1, "checkpoint_off_by_qf": 1}


def test_the_real_check_merge_lists_cross_ayah_entries_per_item():
    jobs = [{"item": {"reciter": 1, "surah": 9}, "verdict": "no_highlight",
             "cross_ayah": [{"from": "9:119", "to": "9:120", "represented": False}]},
            {"item": {"reciter": 3, "surah": 15}, "verdict": "pass"}]
    out = rc.merge("real-check", jobs)
    assert out["cross_ayah"] == {"1/009": [{"from": "9:119", "to": "9:120", "represented": False}], "3/015": []}
    assert '"1/009"' in rc.markdown(out)


def test_flags_against_qf_give_the_start_error_and_the_qf_occurrences():
    refs = [{"ayah": 2, "start_ms": 1000, "end_ms": 9000,
             "words": [{"index": 1, "start_ms": 1200, "end_ms": 1600}, {"index": 2, "start_ms": 1600, "end_ms": 2000},
                       {"index": 1, "start_ms": 2000, "end_ms": 2400}]}]
    words = [{"ayah": 2, "position": 1, "start_ms": 1500, "end_ms": 6000},
             {"ayah": 2, "position": 2, "start_ms": 6000, "end_ms": 6400}]
    gate_doc = {"checks": {"G3": {"failed": [2]}, "stretch": {"words": [["9:2", 1, 4500]]}}}
    out = rc.flags_vs_qf(gate_doc, words, refs)
    assert out["g3_failed"] == [{"ayah": 2, "ours_ms": 1500, "qf_ms": 1200, "err_ms": 300}]
    assert out["stretch"] == [{"word": "9:2", "position": 1, "ours_ms": 4500, "qf_ms": [400, 400],
                               "qf_repeat_in_ayah": True}]


def test_moved_against_qf_compares_both_starts_of_a_moved_neighbour():
    refs = [{"ayah": 55, "start_ms": 0, "end_ms": 1, "words": [{"index": 1, "start_ms": 10000, "end_ms": 10400}]}]
    gate_doc = {"repairs": [{"region": ["5:53", "5:55"], "failed": ["moved 5:55", "no-repeat-found"],
                             "tried_starts": {"55": [11200, 10100]}},
                            {"region": ["5:60", "5:61"], "failed": ["G5"], "tried_starts": {"60": [1, 2]}}]}
    assert rc.moved_vs_qf(gate_doc, refs) == [{"region": ["5:53", "5:55"], "ayah": 55, "before_err_ms": 1200,
                                                "after_err_ms": 100}]


def test_the_g2_probe_items_are_pinned_abadh_surahs():
    items = rc.plan("g2-probe")
    assert items and all(i["reciter"] == 1 and len(i["sha256"]) == 64 and i["source"] == "way2quran" for i in items)


def test_the_abadh_sample_merge_sets_each_verdict_against_q8():
    items = rc.plan("abadh-sample")
    assert 10 <= len(items) <= 20 and all(len(i["sha256"]) == 64 and i.get("q8") for i in items)
    jobs = [{"item": {"reciter": 1, "surah": 106, "q8": "no_highlight"}, "verdict": "pass"},
            {"item": {"reciter": 1, "surah": 68, "q8": "repaired"}, "verdict": "no_highlight"}]
    out = rc.merge("abadh-sample", jobs)
    assert out["vs_q8"] == {"106": ["no_highlight", "pass"], "068": ["repaired", "no_highlight"]}
    assert out["ships"] == 1 and out["cross_ayah"] == {"1/106": [], "1/068": []}

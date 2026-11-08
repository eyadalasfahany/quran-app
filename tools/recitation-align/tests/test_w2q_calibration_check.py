"""The CI calibration check (plan way2quran-quality Q10): known outcomes, speed, projection. Placeholder
records only: no Quran text, no model, no network."""

import importlib.util
import json
from pathlib import Path

import pytest

TOOL = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("w2q_calibration_check", TOOL / "scripts" / "w2q_calibration_check.py")
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)

SHA = "a" * 64
FILE = {"1": [5, 9], "3": [15, 16, 18, 19, 23, 55]}


def comp(surah, verdict="complete", first=1, last=10, seconds=10.0, duration_ms=100_000):
    return {"surah": surah, "verdict": verdict, "first_heard_ayah": first, "last_heard_ayah": last,
            "seconds": seconds, "duration_ms": duration_ms, "sha256": SHA}


def gate(surah, verdict="pass", repairs=(), seconds=None):
    return {"surah": surah, "verdict": verdict, "repairs": list(repairs),
            "seconds": seconds or {"g3": 20.0, "g4": 5.0, "g2": 1.0, "repair": 4.0}}


def aligned(surah):
    return {"surah": surah, "anchors": {"seconds": {"asr": 30.0, "locate": 35.0, "align": 10.0}}}


def repair(lo, hi, accepted=True, surah=5):
    return {"region": [f"{surah}:{lo}", f"{surah}:{hi}"], "accepted": accepted}


def put(root, sub, surah, doc):
    path = root / sub / f"{surah:03d}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc), encoding="utf-8")


def good_handoff(root, reciter):
    """A hand-off folder where every calibration surah of the reciter has its expected outcome."""
    if reciter == 3:
        for s in (15, 18, 55):
            put(root, "completeness", s, comp(s))
            put(root, "gate", s, gate(s, "repaired" if s == 18 else "pass"))
            put(root, "aligned", s, aligned(s))
        for s, verdict, rng in ((16, "incomplete-both", (53, 119)), (19, "incomplete-end", (1, 76)),
                                (23, "incomplete-end", (1, 22))):
            put(root, "completeness", s, comp(s, verdict, *rng, duration_ms=50_000))
            put(root, "gate", s, gate(s, "unavailable", seconds={}))
    else:
        put(root, "completeness", 5, comp(5, duration_ms=200_000))
        put(root, "gate", 5, gate(5, "repaired", [repair(30, 32), repair(84, 85)]))
        put(root, "aligned", 5, aligned(5))
        put(root, "completeness", 9, comp(9))
        put(root, "gate", 9, gate(9))
        put(root, "aligned", 9, aligned(9))


def run_check(root, reciter, tmp_path, monkeypatch):
    cal = tmp_path / "cal.json"
    cal.write_text(json.dumps({"schema": 1, "reciters": FILE}), encoding="utf-8")
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)
    return M.main(["check", "--reciter", str(reciter), "--handoff", str(root), "--calibration", str(cal)])


@pytest.mark.parametrize("reciter", [1, 3])
def test_the_expected_outcomes_pass(tmp_path, monkeypatch, capsys, reciter):
    good_handoff(tmp_path / "h", reciter)
    assert run_check(tmp_path / "h", reciter, tmp_path, monkeypatch) == 0
    assert "Result: PASS" in capsys.readouterr().out


def test_partial_surahs_accept_unavailable_or_the_partial_range_outcome():
    assert M.PARTIAL_GATE_VERDICTS == ("unavailable", "pass", "repaired")
    assert all(M.partial_gate_ok(v) for v in ("unavailable", "pass", "repaired"))
    assert not M.partial_gate_ok("no_highlight")


@pytest.mark.parametrize("verdict", ["unavailable", "pass", "repaired"])
def test_a_partial_surah_with_an_accepted_gate_verdict_passes(verdict):
    entry = {"reciter": 3, "surah": 16, "comp": comp(16, "incomplete-both", 53, 119),
             "gate": gate(16, verdict), "seconds": {}, "audio_s": 1, "aligned_here": False}
    assert M.check_surah(entry) == []


def test_a_partial_surah_with_no_highlight_fails():
    entry = {"reciter": 3, "surah": 16, "comp": comp(16, "incomplete-both", 53, 119),
             "gate": gate(16, "no_highlight"), "seconds": {}, "audio_s": 1, "aligned_here": False}
    assert "partial surah gate no_highlight" in M.check_surah(entry)[0]


def test_a_wrong_completeness_verdict_or_range_fails(tmp_path, monkeypatch, capsys):
    root = tmp_path / "h"
    good_handoff(root, 3)
    put(root, "completeness", 16, comp(16, "incomplete-both", 54, 119))
    put(root, "completeness", 19, comp(19, "complete", 1, 286))
    assert run_check(root, 3, tmp_path, monkeypatch) == 1
    err = capsys.readouterr().err
    assert "3/016: recorded range [54, 119], expected [53, 119]" in err
    assert "3/019: completeness complete, expected incomplete-end" in err


def test_a_complete_surah_that_fails_the_gate_fails(tmp_path, monkeypatch, capsys):
    root = tmp_path / "h"
    good_handoff(root, 3)
    put(root, "gate", 15, gate(15, "no_highlight"))
    put(root, "gate", 18, gate(18, "unavailable"))
    assert run_check(root, 3, tmp_path, monkeypatch) == 1
    err = capsys.readouterr().err
    assert "3/015: gate no_highlight, expected pass" in err
    assert "3/018: gate unavailable, expected pass or repaired" in err


def test_018_may_pass_or_be_repaired():
    for verdict in ("pass", "repaired"):
        entry = {"reciter": 3, "surah": 18, "comp": comp(18), "gate": gate(18, verdict), "seconds": {},
                 "audio_s": 1, "aligned_here": True}
        assert M.check_surah(entry) == []


def test_005_needs_both_ayahs_inside_accepted_repairs(tmp_path, monkeypatch, capsys):
    root = tmp_path / "h"
    good_handoff(root, 1)
    put(root, "gate", 5, gate(5, "repaired", [repair(30, 32), repair(84, 85, accepted=False)]))
    assert run_check(root, 1, tmp_path, monkeypatch) == 1
    assert "1/005: 5:85 is not inside an accepted repair" in capsys.readouterr().err
    put(root, "gate", 5, gate(5, "pass"))
    assert run_check(root, 1, tmp_path, monkeypatch) == 1
    assert "1/005: gate pass, expected repaired" in capsys.readouterr().err


def test_repaired_ayah_reads_the_region_of_the_same_surah():
    assert M.repaired_ayah([repair(30, 32)], 5, 31)
    assert not M.repaired_ayah([repair(30, 32)], 5, 33)
    assert not M.repaired_ayah([repair(30, 32, surah=6)], 5, 31)
    assert not M.repaired_ayah([{"region": "bad", "accepted": True}], 5, 31)


def test_009_only_needs_to_be_complete(tmp_path, monkeypatch, capsys):
    root = tmp_path / "h"
    good_handoff(root, 1)
    put(root, "completeness", 9, comp(9, "incomplete-end"))
    assert run_check(root, 1, tmp_path, monkeypatch) == 1
    assert "1/009: completeness incomplete-end, expected complete" in capsys.readouterr().err


def test_a_missing_record_fails(tmp_path, monkeypatch, capsys):
    root = tmp_path / "h"
    good_handoff(root, 3)
    (root / "completeness" / "055.json").unlink()
    (root / "gate" / "015.json").unlink()
    assert run_check(root, 3, tmp_path, monkeypatch) == 1
    err = capsys.readouterr().err
    assert "3/055: no completeness record" in err
    assert "3/015: no gate record" in err


def test_a_reciter_outside_the_calibration_file_is_refused(tmp_path, monkeypatch):
    assert run_check(tmp_path, 2, tmp_path, monkeypatch) == 1


def test_the_summary_is_appended_to_the_job_summary(tmp_path, monkeypatch):
    good_handoff(tmp_path / "h", 1)
    summary = tmp_path / "summary.md"
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    cal = tmp_path / "cal.json"
    cal.write_text(json.dumps({"schema": 1, "reciters": FILE}), encoding="utf-8")
    assert M.main(["check", "--reciter", "1", "--handoff", str(tmp_path / "h"), "--calibration", str(cal)]) == 0
    assert "Calibration summary" in summary.read_text(encoding="utf-8")


def test_the_speed_rows_carry_seconds_and_rtf_per_stage():
    entry = M.load_surah(Path("/nonexistent"), 3, 15)
    assert entry["seconds"] == {} and entry["audio_s"] is None
    row = M.surah_row({"reciter": 3, "surah": 15, "comp": comp(15), "gate": gate(15), "aligned": aligned(15),
                       "seconds": {"completeness": 10.0, "asr": 30.0, "g3": 20.0}, "audio_s": 100.0,
                       "aligned_here": True})
    assert row["seconds"] == {"completeness": 10.0, "asr": 30.0, "g3": 20.0, "total": 60.0}
    assert row["rtf"] == {"completeness": 0.1, "asr": 0.3, "g3": 0.2, "total": 0.6}
    assert row["pooled"] is True


def test_load_surah_collects_the_stage_seconds(tmp_path):
    good_handoff(tmp_path, 3)
    entry = M.load_surah(tmp_path, 3, 15)
    assert entry["seconds"] == {"completeness": 10.0, "asr": 30.0, "locate": 35.0, "align": 10.0,
                                "g3": 20.0, "g4": 5.0, "g2": 1.0, "repair": 4.0}
    assert entry["audio_s"] == 100.0


def fixture_data():
    return {"schema": 1, "reciters": [
        {"reciter_id": r, "slug": f"f{r}", "riwayah_folder": "hafs-an-asim", "name_ar": "x", "name_en": "x",
         "moshaf_name": "x", "page_url": "x", "files": {str(s): f"{s:03d}.mp3" for s in range(1, 115)}}
        for r in (1, 2, 3)]}


def fixture_tanzil(tmp_path):
    path = tmp_path / "tanzil.txt"
    path.write_text("".join(f"{s}|1|{'x' * 100}\n" for s in range(1, 115)), encoding="utf-8")
    return path


def test_projection_follows_p9(tmp_path):
    # 100 letters per surah and 100 s of audio per complete calibration surah: 1 s per letter.
    rows = [{"reciter": 3, "surah": s, "completeness": "complete", "audio_s": 100.0} for s in (15, 18)]
    out = M.projected_minutes(rows, 1.0, fixture_data(), fixture_tanzil(tmp_path))
    # 114 surahs x 100 letters x 1 s = 11400 s of audio; /20 = 570 s; x (1.0 + EMISSIONS_RTF) / 60 + overhead.
    expected = round(570 * (1.0 + M.EMISSIONS_RTF) / 60 + M.FIXED_OVERHEAD_MIN, 1)
    assert out == {"1": expected, "2": expected, "3": expected}  # 1 and 2 use the pooled rate


def test_pooled_rtf_uses_only_aligned_surahs():
    rows = [{"pooled": True, "audio_s": 100.0, "seconds": {"asr": 30.0, "total": 60.0}},
            {"pooled": False, "audio_s": 100.0, "seconds": {"completeness": 9.0, "total": 9.0}}]
    pooled = M.pooled_rtf(rows)
    assert pooled["total"] == 0.6 and pooled["asr"] == 0.3
    assert M.pooled_rtf([]) == {}


def artifacts(tmp_path):
    root = tmp_path / "artifacts"
    for reciter in (1, 3):
        folder = root / f"align-w2q-{reciter}-1"
        good_handoff(folder, reciter)
        (folder / f"chunk-{reciter}-1.json").write_text(json.dumps({"reciter": reciter, "chunk": 1}), encoding="utf-8")
    return root


def run_combine(tmp_path, root, out, monkeypatch):
    cal = tmp_path / "cal.json"
    cal.write_text(json.dumps({"schema": 1, "reciters": FILE}), encoding="utf-8")
    data = tmp_path / "data.json"
    data.write_text(json.dumps(fixture_data()), encoding="utf-8")
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)
    return M.main(["combine", "--artifacts", str(root), "--run-id", "42", "--calibration", str(cal),
                   "--data", str(data), "--tanzil", str(fixture_tanzil(tmp_path)), "--out", str(out)])


def test_combine_writes_the_record_with_the_plan_shape(tmp_path, monkeypatch):
    out = tmp_path / "checks" / "ci-calibration.json"
    assert run_combine(tmp_path, artifacts(tmp_path), out, monkeypatch) == 0
    doc = json.loads(out.read_text(encoding="utf-8"))
    assert {"schema", "run_id", "tool_version", "surahs", "projected_chunk_min", "decision", "rtf"} <= set(doc)
    assert doc["passed"] is True and doc["run_id"] == "42"
    assert len(doc["surahs"]) == 8
    assert {"reciter", "surah", "audio_s", "seconds", "rtf"} <= set(doc["surahs"][0])
    assert set(doc["projected_chunk_min"]) == {"1", "2", "3"}
    assert doc["decision"] in ("ASR_EVERY=4", "ASR_EVERY=6")
    assert doc["rtf"]["total"] > 0


def test_combine_moves_asr_every_when_a_chunk_projects_above_the_limit(tmp_path, monkeypatch):
    root = artifacts(tmp_path)
    for path in root.glob("*/gate/*.json"):
        doc = json.loads(path.read_text(encoding="utf-8"))
        if doc["seconds"]:
            doc["seconds"] = {"g3": 1_000_000.0}
            path.write_text(json.dumps(doc), encoding="utf-8")
    out = tmp_path / "ci.json"
    run_combine(tmp_path, root, out, monkeypatch)
    assert json.loads(out.read_text(encoding="utf-8"))["decision"] == "ASR_EVERY=6"


def test_combine_fails_on_a_missing_reciter_artifact_and_a_failed_outcome(tmp_path, monkeypatch):
    root = artifacts(tmp_path)
    import shutil
    shutil.rmtree(root / "align-w2q-1-1")
    out = tmp_path / "ci.json"
    assert run_combine(tmp_path, root, out, monkeypatch) == 1
    doc = json.loads(out.read_text(encoding="utf-8"))
    assert doc["passed"] is False and "reciter 1: no hand-off artifact" in doc["failures"][0]


def test_the_check_prints_the_gate_details_of_every_surah(tmp_path, monkeypatch, capsys):
    good_handoff(tmp_path / "h", 1)
    put(tmp_path / "h", "refused", 9, {"stage": "anchors", "reason": "unresolved pace break"})
    assert run_check(tmp_path / "h", 1, tmp_path, monkeypatch) == 0
    out = capsys.readouterr().out
    assert "Result: PASS" in out
    assert "## Gate details (Way2Quran quality)" in out
    assert "#### Surah 5: repaired" in out
    assert "- repairs: 2 accepted, 0 rejected" in out
    assert "#### Surah 9: no record" not in out
    assert "#### Surah 9: refused" not in out  # 9 is in the calibration file and has a complete record
    assert "- refused at anchors: unresolved pace break" in out


def test_the_check_details_show_a_failed_surah_next_to_its_reason(tmp_path, monkeypatch, capsys):
    good_handoff(tmp_path / "h", 1)
    put(tmp_path / "h", "gate", 5, {**gate(5, "no_highlight"), "reasons": ["repair-failed"], "repairs": [
        {"kind": "onset", "word": "17:17", "region": ["5:17", "5:17"], "accepted": False, "failed": ["not-squeezed"]}]})
    assert run_check(tmp_path / "h", 1, tmp_path, monkeypatch) == 1
    out = capsys.readouterr().out
    assert "#### Surah 5: no_highlight" in out
    assert "- gate reasons: repair-failed" in out
    assert "- onset 17:17 (5:17): not-squeezed" in out

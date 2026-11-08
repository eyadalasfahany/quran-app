"""The Way2Quran gate details for the CI log: synthetic records in the shape of the hand-off folder. No Quran text."""

import importlib.util
import json
from pathlib import Path

TOOL = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("w2q_explain", TOOL / "scripts" / "w2q_explain.py")
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)


def comp(surah=5, verdict="complete", first=1, last=10):
    return {"surah": surah, "verdict": verdict, "first_heard_ayah": first, "last_heard_ayah": last}


def checks(**over):
    base = {
        "G3": {"failed": [], "unprobed": [], "bad": 0, "n": 10, "ok": 10},
        "G4": {"bad_at": [], "bad": 0, "n": 10},
        "G5": {"status": "pass", "outlier_ayahs": []},
        "G6": {"low_conf_ayahs": [], "share": 0.0},
        "middle_gap": {"breaks": [], "flag": False},
        "stretch": {"words": [], "elongations": []},
    }
    base.update(over)
    return base


def gate(verdict="pass", reasons=(), repairs=(), **over):
    return {"surah": 5, "verdict": verdict, "reasons": list(reasons), "repairs": list(repairs), "checks": checks(**over)}


def repair(kind="onset", word=None, region=("5:17", "5:17"), accepted=False, failed=("not-squeezed",)):
    out = {"kind": kind, "region": list(region), "accepted": accepted, "failed": list(failed)}
    if word:
        out["word"] = word
    return out


def test_a_refused_surah_gives_the_stage_and_reason():
    refused = {"stage": "anchors", "reason": "unresolved pace break(s) at 3000-3120 s", "surah": 9}
    lines = M.explain_surah(9, comp(9), None, refused)
    assert lines[0] == "#### Surah 9: refused"
    assert "- refused at anchors: unresolved pace break(s) at 3000-3120 s" in lines
    assert not any("gate reasons" in line for line in lines)


def test_an_incomplete_surah_gives_its_verdict_and_heard_range():
    lines = M.explain_surah(16, comp(16, "incomplete-both", 53, 119), gate(verdict="unavailable"), None)
    assert lines == [
        "#### Surah 16: unavailable",
        "- completeness: incomplete-both, first heard ayah 53, last heard ayah 119",
    ]


def test_an_incomplete_surah_without_a_gate_uses_its_completeness_verdict_as_heading():
    assert M.explain_surah(19, comp(19, "incomplete-end", 1, 76), None, None) == [
        "#### Surah 19: incomplete-end",
        "- completeness: incomplete-end, first heard ayah 1, last heard ayah 76",
    ]


def test_a_no_highlight_surah_gives_the_stretch_words_the_gate_checks_and_the_repairs():
    g = gate(
        verdict="no_highlight",
        reasons=["repair-failed"],
        repairs=[
            repair(word="17:17", accepted=False, failed=("not-squeezed",)),
            repair(kind="within-ayah", region=("5:11", "5:15"), failed=("stretch 5:12", "no-repeat-found")),
            repair(kind="onset", word="49:27", region=("5:49", "5:49"), failed=("no-step-found",)),
            repair(kind="within-ayah", region=("5:16", "5:18"), accepted=True, failed=()),
        ],
        G3={"failed": [17], "unprobed": [120], "bad": 1, "n": 10, "ok": 9},
        G4={"bad_at": ["6:4", "17:19"], "bad": 2, "n": 10},
        G5={"status": "fail", "outlier_ayahs": [3]},
        G6={"low_conf_ayahs": [17, 33], "share": 0.1},
        middle_gap={"breaks": ["5:40"], "flag": True},
        stretch={"words": [["5:12", 35, 5285], ["5:14", 21, 5546]], "elongations": []},
    )
    lines = M.explain_surah(5, comp(5), g, None)
    assert lines[0] == "#### Surah 5: no_highlight"
    assert "- gate reasons: repair-failed" in lines
    assert "- G3 failed ayah starts: 17" in lines
    assert "- G3 unprobed: 120" in lines
    assert "- G4 bad at: 6:4, 17:19" in lines
    assert "- G5 status: fail, outlier ayahs: 3" in lines
    assert "- stretched words: 5:12 word 35 (5.3 s), 5:14 word 21 (5.5 s)" in lines
    assert "- G6 low-confidence ayahs: 17, 33" in lines
    assert "- middle gap breaks: 5:40" in lines
    assert "- repairs: 1 accepted, 3 rejected" in lines
    assert "- onset 17:17 (5:17): not-squeezed" in lines
    assert "- within-ayah (5:11-5:15): stretch 5:12, no-repeat-found" in lines
    assert "- onset 49:27 (5:49): no-step-found" in lines
    assert "- accepted: within-ayah (5:16-5:18)" in lines


def test_a_passing_gate_with_quiet_checks_prints_only_the_heading():
    assert M.explain_surah(1, comp(1), gate(), None) == ["#### Surah 1: pass"]


def test_a_pass_with_a_refusal_still_says_why():
    refused = {"stage": "anchors", "reason": "x"}
    lines = M.explain_surah(1, comp(1), gate(), refused)
    assert lines[0] == "#### Surah 1: pass" and "- refused at anchors: x" in lines


def test_a_skipped_g5_says_why_it_was_not_run():
    g = gate(verdict="unavailable", G5={"reason": "not run", "status": "skipped"})
    assert "- G5 status: skipped (not run)" in M.explain_surah(16, comp(16, "incomplete-both"), g, None)


def test_long_lists_are_capped_at_thirty_with_a_count():
    words = [[f"5:{i}", i, 1000] for i in range(1, 36)]
    lines = M.explain_surah(5, comp(5), gate(verdict="no_highlight", stretch={"words": words, "elongations": []}), None)
    stretched = next(line for line in lines if line.startswith("- stretched words:"))
    assert stretched.count(" word ") == 30
    assert stretched.endswith(", … +5 more")

    rejected = [repair(word=f"5:{i}") for i in range(1, 36)]
    lines = M.explain_surah(5, comp(5), gate(verdict="no_highlight", repairs=rejected), None)
    assert "- … +5 more" in lines
    assert sum(1 for line in lines if line.startswith("- onset ")) == 30


def test_a_surah_with_no_records_still_has_a_heading():
    assert M.explain_surah(7, None, None, None) == ["#### Surah 7: no record"]


def write(root, sub, surah, doc):
    path = root / sub / f"{surah:03d}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc), encoding="utf-8")


def test_the_cli_reports_every_surah_and_writes_out(tmp_path, monkeypatch, capsys):
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)
    root = tmp_path / "handoff"
    write(root, "completeness", 9, comp(9))
    write(root, "refused", 9, {"stage": "anchors", "reason": "gap"})
    write(root, "completeness", 16, comp(16, "incomplete-both", 53, 119))
    write(root, "gate", 16, gate(verdict="unavailable"))
    write(root, "completeness", 1, comp(1))
    write(root, "gate", 1, gate())
    out = tmp_path / "out" / "details.md"
    assert M.main(["--handoff", str(root), "--out", str(out)]) == 0
    printed = capsys.readouterr().out
    assert printed.startswith("## Gate details (Way2Quran quality)\n")
    assert "#### Surah 1: pass" in printed
    assert "#### Surah 9: refused" in printed and "- refused at anchors: gap" in printed
    assert "#### Surah 16: unavailable" in printed
    assert out.read_text(encoding="utf-8") == printed


def test_the_cli_filters_by_surah(tmp_path, monkeypatch, capsys):
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)
    write(tmp_path, "refused", 9, {"stage": "anchors", "reason": "gap"})
    write(tmp_path, "refused", 10, {"stage": "anchors", "reason": "other"})
    assert M.main(["--handoff", str(tmp_path), "--surah", "10"]) == 0
    printed = capsys.readouterr().out
    assert "#### Surah 10: refused" in printed and "Surah 9" not in printed


def test_the_cli_appends_to_the_step_summary(tmp_path, monkeypatch, capsys):
    write(tmp_path, "gate", 2, gate())
    summary = tmp_path / "summary.md"
    summary.write_text("earlier step\n", encoding="utf-8")
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    assert M.main(["--handoff", str(tmp_path)]) == 0
    assert M.main(["--handoff", str(tmp_path)]) == 0
    capsys.readouterr()
    text = summary.read_text(encoding="utf-8")
    assert text.startswith("earlier step\n")
    assert text.count("## Gate details (Way2Quran quality)") == 2


def test_the_cli_says_when_everything_passed_and_exits_zero_on_an_empty_folder(tmp_path, monkeypatch, capsys):
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)
    write(tmp_path, "gate", 1, gate())
    assert M.main(["--handoff", str(tmp_path)]) == 0
    assert "All surahs passed." in capsys.readouterr().out
    empty = tmp_path / "empty"
    empty.mkdir()
    assert M.main(["--handoff", str(empty)]) == 0
    assert "No surah records." in capsys.readouterr().out

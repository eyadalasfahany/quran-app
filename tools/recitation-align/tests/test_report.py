"""Quality-mode reports (plan way2quran-quality Q1): shapes, release rules R1–R7 with P4 caps, the merge and
the PR markdown. Synthetic placeholder records only; no Quran text, no model, no network.
"""

import copy
import hashlib
import json

import pytest

from recitation_align import quality
from recitation_align import report as R


def sha(tag: str) -> str:
    return hashlib.sha256(tag.encode("utf-8")).hexdigest()


def completeness(surah: int, *, ayah_count: int = 10, verdict: str = "complete", stored: bool = True) -> dict:
    rec = {
        "schema": 1, "surah": surah, "file": f"{surah:03d}.mp3", "sha256": sha(f"surah {surah}"),
        "bytes": 1000, "duration_ms": 60000, "source_last_modified": "FIXTURE date",
        "first_sound_s": 0.4, "last_sound_s": 59.1,
        "opening": {"words": 6, "scores": [90.0], "heard": True, "at_s": 0.0},
        "ending": {"words": 6, "scores": [90.0], "heard": True, "at_s": None},
        "first_heard_ayah": 1, "last_heard_ayah": ayah_count, "ayah_count": ayah_count,
        "ending_at_s": None, "trailing_s": None, "windows": {"head": 1, "tail": 1},
        "asr_calls_extra": 2, "ms_per_letter": 160, "verdict": verdict,
        "check": "completeness-1|tarteel-ai/whisper-base-ar-quran@FIXTURE", "tool_version": "0.1.0+q2",
    }
    if not stored:
        rec["seconds"] = 1.0
    return rec


def checks() -> dict:
    return {
        "G0": "complete", "G1": "ok", "G2": {"last_ayah": "OK", "last_word": "OK", "tail_s": 7.9},
        "G3": {"n": 9, "ok": 9, "bad": 0, "unsure": 0, "failed": []},
        "G4": {"n": 6, "exact": 5, "pm1": 1, "bad": 0, "triggered": []},
        "G5": {"n": 40, "share_300ms": 0.99, "median_ms": 0, "status": "pass"},
        "G6": {"low_conf_ayahs": []}, "stretch": {"words": []},
        "pause": {"pauses": 0, "density": 0.0, "share_07": None},
    }


def gate(surah: int, verdict: str = "pass", *, segments_null=(), cross=(), reasons=(), stored: bool = True):
    rec = {
        "schema": 1, "surah": surah, "sha256": sha(f"surah {surah}"), "tool_version": "0.1.0+q2",
        "verdict": verdict, "reasons": list(reasons), "checks": checks(), "repairs": [],
        "segments_null": list(segments_null), "cross_ayah": list(cross),
    }
    if not stored:
        rec["probes"] = []
        rec["seconds"] = {"g3": 1.0}
    return rec


def entry(surah: int, verdict: str, *, ayah_count: int = 10, segments_null=(), cross=()) -> dict:
    if verdict == "unavailable":
        comp = completeness(surah, ayah_count=ayah_count, verdict="incomplete-both")
        return {"sha256": comp["sha256"], "verdict": verdict, "reason": "incomplete-both", "flags": [],
                "completeness": comp, "gate": None}
    comp = completeness(surah, ayah_count=ayah_count)
    if verdict == "no_highlight":
        g = gate(surah, "no_highlight", reasons=["G3"])
        reason = "G3"
    else:
        g = gate(surah, verdict, segments_null=segments_null, cross=cross)
        reason = None
    return {"sha256": comp["sha256"], "verdict": verdict, "reason": reason, "flags": [],
            "completeness": comp, "gate": g}


def make_report(surahs: dict[int, dict], *, listed: int | None = None, a6a=None) -> dict:
    return {
        "schema": 1, "source": "way2quran", "reciter_id": 3, "run_id": "FIXTURE-run",
        "quality_mode": True, "tool_version": quality.tool_version(),
        "params_digest": quality.params_digest(), "code_digest": quality.code_digest(),
        "models": {"align": "FIXTURE-align@0", "asr": "FIXTURE-asr@0"}, "a6a": a6a,
        "release": {"listed_surahs": len(surahs) if listed is None else listed},
        "surahs": {str(k): v for k, v in surahs.items()},
    }


def passing_a6a(report: dict) -> dict:
    return {"passed": True, "tool_version": report["tool_version"], "params_digest": report["params_digest"],
            "code_digest": report["code_digest"]}


def with_a6a(report: dict) -> dict:
    report["a6a"] = passing_a6a(report)
    return report


def failed_rules(report: dict, previous: dict | None = None) -> list[str]:
    return R.release_rules(report, previous)[1]


# ---- shapes -------------------------------------------------------------------------------------------

def test_missing_report_field_is_refused():
    report = with_a6a(make_report({1: entry(1, "pass", segments_null=[])}))
    del report["params_digest"]
    with pytest.raises(ValueError, match="params_digest"):
        R.release_rules(report)


def test_missing_completeness_field_is_refused():
    rec = completeness(1, stored=False)
    del rec["verdict"]
    with pytest.raises(ValueError, match="verdict"):
        R.validate_completeness(rec)


def test_unknown_completeness_verdict_is_refused():
    rec = completeness(1, verdict="maybe", stored=False)
    with pytest.raises(ValueError, match="not a known verdict"):
        R.validate_completeness(rec)


def test_gate_record_needs_its_checks():
    rec = gate(1, stored=False)
    del rec["checks"]["G5"]
    with pytest.raises(ValueError, match="G5"):
        R.validate_gate(rec)


def test_refusal_record_shape():
    R.validate_refusal({"schema": 1, "surah": 5, "stage": "aligner", "reason": "FIXTURE reason"})
    with pytest.raises(ValueError, match="stage"):
        R.validate_refusal({"schema": 1, "surah": 5, "stage": "other", "reason": "x"})


def test_pass_entry_without_gate_is_refused():
    surah = entry(1, "pass", segments_null=[])
    surah["gate"] = None
    report = with_a6a(make_report({1: surah}))
    with pytest.raises(ValueError, match="no gate"):
        R.validate_reciter_report(report)


def test_surah_key_must_be_a_surah_number():
    report = with_a6a(make_report({1: entry(1, "pass", segments_null=[])}))
    report["surahs"]["01"] = report["surahs"].pop("1")
    with pytest.raises(ValueError, match="surah key"):
        R.validate_reciter_report(report)


# ---- R1 to R7 -----------------------------------------------------------------------------------------

def all_pass(n: int, ayah_count: int = 10) -> dict[int, dict]:
    return {s: entry(s, "pass", ayah_count=ayah_count, segments_null=[]) for s in range(1, n + 1)}


def test_a_clean_report_is_releasable():
    report = with_a6a(make_report(all_pass(5)))
    releasable, failed, counts = R.release_rules(report)
    assert releasable is True and failed == []
    assert counts["pass"] == 5 and counts["available_surahs"] == 5 and counts["available_ayahs"] == 50


def test_r1_listed_count_must_match_the_surahs():
    report = with_a6a(make_report(all_pass(4), listed=5))
    assert "R1" in failed_rules(report)


def test_r2_floor_is_zero_for_fifty_four_surahs():
    surahs = {s: entry(s, "pass", ayah_count=1000, segments_null=[]) for s in range(1, 55)}
    surahs[54] = entry(54, "no_highlight", ayah_count=1)
    report = with_a6a(make_report(surahs))
    assert "R2" in failed_rules(report)


def test_r2_allows_one_no_highlight_for_one_hundred_fourteen_surahs():
    surahs = {s: entry(s, "pass", ayah_count=1000, segments_null=[]) for s in range(1, 115)}
    surahs[114] = entry(114, "no_highlight", ayah_count=1)
    report = with_a6a(make_report(surahs))
    assert "R2" not in failed_rules(report)


def test_r2_rejects_a_second_no_highlight_for_one_hundred_fourteen_surahs():
    surahs = {s: entry(s, "pass", ayah_count=1000, segments_null=[]) for s in range(1, 113)}
    surahs[113] = entry(113, "no_highlight", ayah_count=1)
    surahs[114] = entry(114, "no_highlight", ayah_count=1)
    report = with_a6a(make_report(surahs))
    assert "R2" in failed_rules(report)


def test_r2_ayah_share_is_one_percent():
    # 114 surahs of 1000 ayahs; the one no_highlight surah has 2000. The count (1) is within the floor,
    # but 2000 ayahs is above 1% of the 115000 available.
    surahs = {1: entry(1, "no_highlight", ayah_count=2000)}
    surahs.update({s: entry(s, "pass", ayah_count=1000, segments_null=[]) for s in range(2, 115)})
    report = with_a6a(make_report(surahs))
    assert "R2" in failed_rules(report)


def test_r3_boundary_is_two_percent_of_available_ayahs():
    # 100 surahs of 100 ayahs: 10000 available, so 200 null ayahs is the limit.
    base = {s: entry(s, "pass", ayah_count=100, segments_null=["s:0", "s:1"]) for s in range(1, 101)}
    assert "R3" not in failed_rules(with_a6a(make_report(base)))
    base[1] = entry(1, "pass", ayah_count=100, segments_null=["s:0", "s:1", "s:2"])
    assert "R3" in failed_rules(with_a6a(make_report(base)))


def test_r4_boundary_is_ten_percent_of_listed_surahs():
    surahs = {s: entry(s, "pass", segments_null=[]) for s in range(1, 91)}
    surahs.update({s: entry(s, "unavailable") for s in range(91, 101)})
    assert "R4" not in failed_rules(with_a6a(make_report(surahs)))
    surahs[90] = entry(90, "unavailable")
    assert "R4" in failed_rules(with_a6a(make_report(surahs)))


def test_r5_fails_when_a6a_is_null():
    report = make_report(all_pass(3))
    assert report["a6a"] is None
    assert "R5" in failed_rules(report)


def test_r5_needs_the_exact_digests():
    report = with_a6a(make_report(all_pass(3)))
    report["a6a"]["code_digest"] = "0" * 16
    assert "R5" in failed_rules(report)


def test_r5_needs_a_passing_record():
    report = with_a6a(make_report(all_pass(3)))
    report["a6a"]["passed"] = False
    assert "R5" in failed_rules(report)


def test_r6_keeps_committed_timings():
    previous = with_a6a(make_report(all_pass(3)))
    current = with_a6a(make_report(all_pass(3)))
    assert "R6" not in failed_rules(current, previous)

    dropped = all_pass(3)
    dropped[2] = entry(2, "no_highlight")
    assert "R6" in failed_rules(with_a6a(make_report(dropped)), previous)


def test_r6_fails_when_the_audio_sha_changed():
    previous = with_a6a(make_report(all_pass(2)))
    current = all_pass(2)
    current[2]["sha256"] = sha("other audio")
    current[2]["completeness"]["sha256"] = current[2]["sha256"]
    current[2]["gate"]["sha256"] = current[2]["sha256"]
    assert "R6" in failed_rules(with_a6a(make_report(current)), previous)


def test_r7_fails_on_an_unrepresented_cross_ayah_jump():
    surahs = all_pass(2)
    surahs[2] = entry(2, "pass", segments_null=[], cross=[{"from": "5:30", "to": "5:32", "represented": False}])
    assert "R7" in failed_rules(with_a6a(make_report(surahs)))
    surahs[2] = entry(2, "pass", segments_null=[], cross=[{"from": "5:30", "to": "5:32", "represented": True}])
    assert "R7" not in failed_rules(with_a6a(make_report(surahs)))


def test_counts_are_computed_from_the_surahs():
    surahs = all_pass(4)
    surahs[3] = entry(3, "repaired", segments_null=[])
    surahs[4] = entry(4, "no_highlight")
    report = with_a6a(make_report(surahs))
    _, _, counts = R.release_rules(report)
    assert counts["pass"] == 2 and counts["repaired"] == 1 and counts["no_highlight"] == 1
    assert counts["no_highlight_ayahs"] == 10 and counts["segments_null_ayahs"] == 0


# ---- merge ---------------------------------------------------------------------------------------------

def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def handoff(tmp_path, *, surahs=(1, 2, 3, 4, 5)):
    base = tmp_path / "handoff"
    files = {}
    for s in surahs:
        files[str(s)] = f"{s:03d}.mp3"
    entry_doc = {"reciter_id": 3, "files": files}

    def comp(s, verdict="complete"):
        rec = completeness(s, verdict=verdict, stored=False)
        return rec

    def gate_rec(s, verdict, reasons=()):
        return gate(s, verdict, reasons=reasons, stored=False)

    write(base / "completeness" / "001.json", comp(1))
    write(base / "gate" / "001.json", gate_rec(1, "pass"))
    write(base / "completeness" / "002.json", comp(2))
    write(base / "gate" / "002.json", gate_rec(2, "repaired"))
    write(base / "completeness" / "003.json", comp(3))
    write(base / "gate" / "003.json", gate_rec(3, "no_highlight", ["G3"]))
    write(base / "completeness" / "004.json", comp(4))
    write(base / "refused" / "004.json", {"schema": 1, "surah": 4, "stage": "aligner", "reason": "FIXTURE"})
    write(base / "completeness" / "005.json", comp(5, verdict="incomplete-both"))
    return base, entry_doc


def test_merge_maps_each_surah_to_its_verdict(tmp_path):
    base, doc = handoff(tmp_path)
    report = R.merge_reciter_report(base, doc, "FIXTURE-run")
    s = report["surahs"]
    assert s["1"]["verdict"] == "pass" and s["1"]["reason"] is None
    assert s["2"]["verdict"] == "repaired"
    assert s["3"]["verdict"] == "no_highlight" and s["3"]["reason"] == "G3"
    assert s["4"]["verdict"] == "no_highlight" and s["4"]["reason"] == "G1" and s["4"]["gate"] is None
    assert s["5"]["verdict"] == "unavailable" and s["5"]["reason"] == "incomplete-both"
    assert s["5"]["gate"] is None
    assert report["release"]["listed_surahs"] == 5
    assert report["release"]["unavailable"] == 1
    assert report["quality_mode"] is True and report["a6a"] is None
    assert report["tool_version"] == "0.1.0+q2"
    assert report["models"]["asr"].startswith("tarteel-ai/whisper-base-ar-quran@")


def test_merge_strips_seconds_and_probes_and_releases_nothing_without_a6a(tmp_path):
    base, doc = handoff(tmp_path)
    report = R.merge_reciter_report(base, doc, "FIXTURE-run")
    assert "seconds" not in report["surahs"]["1"]["completeness"]
    assert "probes" not in report["surahs"]["1"]["gate"]
    assert "seconds" not in report["surahs"]["1"]["gate"]
    assert report["release"]["releasable"] is False
    assert "R5" in report["release"]["rules_failed"] and "R4" in report["release"]["rules_failed"]


def test_merge_refuses_a_missing_completeness_record(tmp_path):
    base, doc = handoff(tmp_path)
    (base / "completeness" / "002.json").unlink()
    with pytest.raises(ValueError, match="surah 2"):
        R.merge_reciter_report(base, doc, "FIXTURE-run")


def test_merge_refuses_a_gate_with_another_sha(tmp_path):
    base, doc = handoff(tmp_path)
    rec = json.loads((base / "gate" / "001.json").read_text(encoding="utf-8"))
    rec["sha256"] = sha("another file")
    write(base / "gate" / "001.json", rec)
    with pytest.raises(ValueError, match="does not match"):
        R.merge_reciter_report(base, doc, "FIXTURE-run")


def test_merge_refuses_a_file_name_that_differs(tmp_path):
    base, doc = handoff(tmp_path)
    doc["files"]["1"] = "999.mp3"
    with pytest.raises(ValueError, match="does not match the reciter"):
        R.merge_reciter_report(base, doc, "FIXTURE-run")


def test_merge_refuses_a_complete_surah_with_no_gate_or_refusal(tmp_path):
    base, doc = handoff(tmp_path)
    (base / "gate" / "001.json").unlink()
    with pytest.raises(ValueError, match="no gate or refusal"):
        R.merge_reciter_report(base, doc, "FIXTURE-run")


def test_merge_refuses_another_tool_version(tmp_path):
    base, doc = handoff(tmp_path)
    rec = json.loads((base / "completeness" / "001.json").read_text(encoding="utf-8"))
    rec["tool_version"] = "0.1.0+q0"
    write(base / "completeness" / "001.json", rec)
    with pytest.raises(ValueError, match="another tool version"):
        R.merge_reciter_report(base, doc, "FIXTURE-run")


def test_merge_applies_duration_flags_from_the_caller(tmp_path):
    base, doc = handoff(tmp_path)
    report = R.merge_reciter_report(base, doc, "FIXTURE-run", duration_flags={2: ["suspect-duration"]})
    assert report["surahs"]["2"]["flags"] == ["suspect-duration"]
    assert report["surahs"]["1"]["flags"] == []


def test_merge_checks_the_previous_committed_report(tmp_path):
    base, doc = handoff(tmp_path)
    previous = copy.deepcopy(R.merge_reciter_report(base, doc, "FIXTURE-run"))
    previous["surahs"]["3"]["verdict"] = "pass"
    previous["surahs"]["3"]["gate"] = gate(3, "pass", stored=True)
    report = R.merge_reciter_report(base, doc, "FIXTURE-run-2", previous=previous)
    assert "R6" in report["release"]["rules_failed"]


# ---- markdown ------------------------------------------------------------------------------------------

def test_markdown_first_line_names_the_failed_rules():
    report = with_a6a(make_report(all_pass(3)))
    report["release"] = {"listed_surahs": 3, "releasable": False, "rules_failed": ["R2", "R5"]}
    md = R.pr_markdown(report)
    assert md.splitlines()[0] == "Releasable: no (rules failed: R2, R5)"


def test_markdown_releasable_line():
    report = with_a6a(make_report(all_pass(3)))
    releasable, failed, _ = R.release_rules(report)
    report["release"] = {"listed_surahs": 3, "releasable": releasable, "rules_failed": failed}
    assert R.pr_markdown(report).splitlines()[0] == "Releasable: yes"


def test_markdown_lists_excluded_surahs_by_range_and_count(tmp_path):
    base, doc = handoff(tmp_path)
    report = R.merge_reciter_report(base, doc, "FIXTURE-run")
    md = R.pr_markdown(report)
    assert "| 5 | incomplete-both | heard 1–10 | of 10 |" in md
    assert "## Completeness (excluded)" in md and "## Gate per surah" in md


def test_markdown_has_no_arabic_and_stays_small_for_114_rows():
    surahs = {s: entry(s, "pass", segments_null=[]) for s in range(1, 111)}
    surahs.update({s: entry(s, "unavailable") for s in range(111, 115)})
    report = with_a6a(make_report(surahs))
    _, failed, counts = R.release_rules(report)
    report["release"] = {"listed_surahs": 114, "releasable": not failed, "rules_failed": failed, **counts}
    md = R.pr_markdown(report)
    assert not any(0x0600 <= ord(c) <= 0x06FF for c in md)
    assert len(md.encode("utf-8")) < 60 * 1024
    assert md.count("\n| ") >= 114


def test_merge_with_a_committed_pass_fails_r6_when_the_surah_no_longer_passes(tmp_path):
    base, doc = handoff(tmp_path)
    previous = R.merge_reciter_report(base, doc, "FIXTURE-previous")
    assert previous["surahs"]["1"]["verdict"] == "pass"
    write(base / "gate" / "001.json", gate(1, "no_highlight", reasons=["G3"], stored=False))
    report = R.merge_reciter_report(base, doc, "FIXTURE-run", previous=previous)
    assert "R6" in report["release"]["rules_failed"]
    assert "R6" not in R.merge_reciter_report(base, doc, "FIXTURE-run")["release"]["rules_failed"]


def test_a_report_missing_a_gate_file_fails_r1_and_merge_refuses_it(tmp_path):
    base, doc = handoff(tmp_path)
    (base / "gate" / "001.json").unlink()
    with pytest.raises(ValueError, match="no gate or refusal record"):
        R.merge_reciter_report(base, doc, "FIXTURE-run")
    # Allowed only while the gate is pending (Q3): the surah is pending, never a verdict, and R5 fails.
    report = R.merge_reciter_report(base, doc, "FIXTURE-run", allow_pending_gate=True)
    assert report["surahs"]["1"]["verdict"] == "pending"
    short = with_a6a(make_report(all_pass(3)))
    del short["surahs"]["3"]  # three listed, two with a verdict
    assert "R1" in failed_rules(short)

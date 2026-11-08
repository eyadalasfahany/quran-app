"""Way2Quran quality-mode hand-off and finalize (plan way2quran-quality Q3). Placeholder records only: no Quran
text, no model, no network. The finalize steps run as their scripts do in the workflow, on a fixture folder."""

import importlib.util
import json
import subprocess
from pathlib import Path

import pytest

import test_report as TR  # the Q1 record builders (tests/ is on sys.path)
from recitation_align import ci
from recitation_align import report as R

TOOL = Path(__file__).resolve().parents[1]
INGEST_PY = TOOL.parent / "mp3quran-ingest" / ".venv" / "bin" / "python"
PUBLIC = "https://audio.example.test"
RECITER = 3


def load(name):
    spec = importlib.util.spec_from_file_location(name, TOOL / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


stage_mod = load("w2q_stage")
verify_mod = load("w2q_verify_upload")
report_mod = load("w2q_report")
merge_mod = load("ci_merge_manifest")


def file_entry(surah, *, key=None, size=1000):
    sha = TR.sha(f"surah {surah}")
    return {"surah": surah, "key": key or f"audio/way2quran/{RECITER}/{surah:03d}-{sha[:16]}.mp3",
            "url": f"{PUBLIC}/x/{surah:03d}.mp3", "bytes": size, "sha256": sha, "duration_ms": 60000,
            "source_url": f"https://source.example.test/{surah:03d}.mp3", "source_etag": None}


def manifest(surahs, listed):
    return {"schema": 1, "source": "way2quran", "generated_at": "2026-01-01T00:00:00Z", "public_base": PUBLIC,
            "moshafs": [{"moshaf_id": RECITER, "reciter_id": RECITER, "surah_list": sorted(listed),
                         "files": [file_entry(s) for s in sorted(surahs)]}]}


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def make_chunk(tmp_path, chunk, surahs, verdicts, *, listed, uploaded=None, refused=(), name=None):
    """One chunk's working folders (ingest out and align out), staged into its hand-off. Returns the hand-off."""
    ingest, align = tmp_path / f"ingest-{chunk}", tmp_path / f"align-{chunk}"
    write(ingest / f"dry-manifest-{RECITER}-{chunk}.json", manifest(surahs, listed))
    complete = [s for s in surahs if verdicts[s] == "complete"]
    for s in surahs:
        write(align / "completeness" / f"{s:03d}.json", TR.completeness(s, verdict=verdicts[s], stored=False))
    write(align / "completeness" / "complete-surahs.json", complete)
    for s in complete:
        if s not in refused:
            write(align / "aligned" / f"{s:03d}.json", {"surah": s})
        else:
            write(align / "refused" / f"{s:03d}.json",
                  {"schema": 1, "surah": s, "stage": "aligner", "reason": "FIXTURE"})
    if complete:
        write(ingest / f"manifest-{RECITER}-{chunk}.json", manifest(complete if uploaded is None else uploaded, listed))
    handoff = tmp_path / "handoff"
    stage_mod.stage(RECITER, chunk, surahs, ingest, align, handoff)
    return handoff


def reciter_data(tmp_path, listed):
    path = tmp_path / "way2quran_reciters.json"
    write(path, {"schema": 1, "reciters": [{
        "reciter_id": RECITER, "slug": "fixture-3", "riwayah_folder": "hafs-an-asim", "name_ar": "قارئ تجريبي",
        "name_en": "Fixture reciter", "moshaf_name": "FIXTURE - مرتل", "page_url": "https://way2quran.com/ar/reciters/fixture-3",
        "files": {str(s): f"{s:03d}.mp3" for s in listed}}]})
    return path


# ---- staging --------------------------------------------------------------------------------------------------

def test_a_chunk_with_every_surah_excluded_stages_completeness_and_no_upload_part(tmp_path):
    verdicts = {1: "incomplete-both", 2: "unverified"}
    handoff = make_chunk(tmp_path, 1, [1, 2], verdicts, listed=[1, 2])
    names = sorted(p.relative_to(handoff).as_posix() for p in handoff.rglob("*") if p.is_file())
    assert names == ["chunk-3-1.json", "completeness/001.json", "completeness/002.json", "dry-manifest-3-1.json"]
    record = json.loads((handoff / "chunk-3-1.json").read_text(encoding="utf-8"))
    assert record == {"reciter": 3, "chunk": 1, "surahs": [1, 2], "complete": [], "uploaded": []}
    assert not (handoff / "aligned").exists() and not list(handoff.glob("manifest-*"))


def test_a_mixed_chunk_stages_records_aligned_files_and_the_upload_part(tmp_path):
    handoff = make_chunk(tmp_path, 1, [1, 2, 3], {1: "complete", 2: "incomplete-end", 3: "complete"}, listed=[1, 2, 3],
                         refused=[3])
    assert (handoff / "manifest-3-1.json").is_file() and (handoff / "dry-manifest-3-1.json").is_file()
    assert sorted(p.name for p in (handoff / "aligned").iterdir()) == ["001.json"]
    assert sorted(p.name for p in (handoff / "refused").iterdir()) == ["003.json"]
    assert sorted(p.name for p in (handoff / "completeness").iterdir()) == ["001.json", "002.json", "003.json"]
    record = json.loads((handoff / "chunk-3-1.json").read_text(encoding="utf-8"))
    assert record["complete"] == [1, 3] and record["uploaded"] == [1, 3]


def test_staging_without_a_dry_manifest_is_a_tool_error(tmp_path):
    with pytest.raises(SystemExit, match="dry manifest"):
        stage_mod.stage(RECITER, 1, [1], tmp_path / "none", tmp_path / "none", tmp_path / "out")


# ---- upload verification --------------------------------------------------------------------------------------

def verify(tmp_path, dry, uploaded, surahs):
    write(tmp_path / "dry.json", dry)
    write(tmp_path / "up.json", uploaded)
    argv = ["--reciter", str(RECITER), "--dry", str(tmp_path / "dry.json"), "--uploaded", str(tmp_path / "up.json")]
    for s in surahs:
        argv += ["--surah", str(s)]
    return verify_mod.main(argv)


def test_verify_accepts_an_identical_upload(tmp_path, capsys):
    m = manifest([1, 2], [1, 2, 3])
    assert verify(tmp_path, m, manifest([1, 2], [1, 2, 3]), [1, 2]) == 0
    assert "upload verified" in capsys.readouterr().out


def test_verify_refuses_a_key_mismatch(tmp_path, capsys):
    changed = manifest([1, 2], [1, 2, 3])
    changed["moshafs"][0]["files"][1]["key"] = "audio/way2quran/3/other.mp3"
    assert verify(tmp_path, manifest([1, 2], [1, 2, 3]), changed, [1, 2]) == 1
    assert "surah 2: key differs" in capsys.readouterr().err


@pytest.mark.parametrize("field", ["sha256", "bytes"])
def test_verify_refuses_a_hash_or_size_mismatch(tmp_path, capsys, field):
    changed = manifest([1], [1])
    changed["moshafs"][0]["files"][0][field] = "0" * 64 if field == "sha256" else 5
    assert verify(tmp_path, manifest([1], [1]), changed, [1]) == 1
    assert f"{field} differs" in capsys.readouterr().err


def test_verify_refuses_a_different_set_of_surahs(tmp_path, capsys):
    assert verify(tmp_path, manifest([1, 2], [1, 2]), manifest([1], [1, 2]), [1, 2]) == 1
    assert "differ from the intended" in capsys.readouterr().err


# ---- the report, with no upload part --------------------------------------------------------------------------

def three_chunks(tmp_path):
    make_chunk(tmp_path, 1, [1, 2], {1: "complete", 2: "complete"}, listed=[1, 2, 3, 4, 5], refused=[2])
    make_chunk(tmp_path, 2, [3, 4], {3: "incomplete-start", 4: "incomplete-both"}, listed=[1, 2, 3, 4, 5])
    make_chunk(tmp_path, 3, [5], {5: "complete"}, listed=[1, 2, 3, 4, 5])
    return tmp_path / "handoff"


def merge_report(tmp_path, handoff, *extra):
    data = reciter_data(tmp_path, [1, 2, 3, 4, 5])
    out = tmp_path / "checks" / f"way2quran-{RECITER}.json"
    code = report_mod.main(["merge", "--reciter", str(RECITER), "--handoff", str(handoff), "--out", str(out),
                            "--run-id", "FIXTURE-run", "--reciters", str(data), *extra])
    return code, out


def test_the_report_merge_handles_chunks_with_no_upload_part(tmp_path):
    handoff = three_chunks(tmp_path)
    assert not list(handoff.glob("manifest-3-2.json"))
    code, out = merge_report(tmp_path, handoff, "--allow-pending-gate")
    assert code == 0
    report = json.loads(out.read_text(encoding="utf-8"))
    verdicts = {k: (v["verdict"], v["reason"]) for k, v in report["surahs"].items()}
    assert verdicts == {"1": ("pending", "gate-pending"), "2": ("no_highlight", "G1"),
                        "3": ("unavailable", "incomplete-start"), "4": ("unavailable", "incomplete-both"),
                        "5": ("pending", "gate-pending")}
    release = report["release"]
    assert release["releasable"] is False and "R5" in release["rules_failed"]
    assert release["pending"] == 2 and release["unavailable"] == 2


def test_without_the_flag_a_complete_surah_with_no_gate_record_is_still_refused(tmp_path):
    handoff = three_chunks(tmp_path)
    with pytest.raises(ValueError, match="complete but has no gate or refusal record"):
        merge_report(tmp_path, handoff)


def test_a_pending_report_is_never_releasable_even_with_a_passing_a6a(tmp_path):
    handoff = three_chunks(tmp_path)
    _, out = merge_report(tmp_path, handoff, "--allow-pending-gate")
    report = json.loads(out.read_text(encoding="utf-8"))
    report["a6a"] = {"passed": True, "tool_version": report["tool_version"],
                     "params_digest": report["params_digest"], "code_digest": report["code_digest"]}
    releasable, failed, _ = R.release_rules(report)
    assert not releasable and "R5" in failed


# ---- exclusion, the reduced manifest merge and the PR markdown --------------------------------------------------

def exclude_by_hand(data_path, report):
    """The data-file change `way2quran-exclude --write` makes, for runs without the ingest venv."""
    doc = json.loads(data_path.read_text(encoding="utf-8"))
    entry = doc["reciters"][0]
    entry["excluded"] = {}
    for key, item in report["surahs"].items():
        if item["verdict"] == "unavailable":
            del entry["files"][key]
            entry["excluded"][key] = {"file": f"{int(key):03d}.mp3", "reason": item["reason"]}
    data_path.write_text(json.dumps(doc), encoding="utf-8")


def merge_manifest_with(tmp_path, handoff, data_path, *extra):
    aligned, refused = tmp_path / "aligned", tmp_path / "refused"
    aligned.mkdir(exist_ok=True)
    refused.mkdir(exist_ok=True)
    for src, dst in ((handoff / "aligned", aligned), (handoff / "refused", refused)):
        for path in src.glob("*.json"):
            (dst / path.name).write_bytes(path.read_bytes())
    committed = tmp_path / "committed.json"
    return merge_mod.main(["--source", "way2quran", "--moshaf", str(RECITER), "--parts", str(handoff),
                           "--aligned", str(aligned), "--manifest", str(committed), *extra,
                           "--refused", str(refused)]), committed


def test_the_default_merge_still_refuses_the_reduced_reciter(tmp_path, capsys):
    handoff = three_chunks(tmp_path)
    code, committed = merge_manifest_with(tmp_path, handoff, reciter_data(tmp_path, [1, 2, 3, 4, 5]))
    assert code == 1 and not committed.exists()
    assert "missing surah(s) [3, 4]" in capsys.readouterr().err


def test_exclude_then_merge_accepts_the_reduced_list_and_a_refused_surah(tmp_path):
    handoff = three_chunks(tmp_path)
    _, out = merge_report(tmp_path, handoff, "--allow-pending-gate")
    data = tmp_path / "way2quran_reciters.json"
    exclude_by_hand(data, json.loads(out.read_text(encoding="utf-8")))
    code, committed = merge_manifest_with(tmp_path, handoff, data, "--data", str(data))
    assert code == 0
    record = json.loads(committed.read_text(encoding="utf-8"))["moshafs"][0]
    assert record["surah_list"] == [1, 2, 5]
    assert [f["surah"] for f in record["files"]] == [1, 2, 5]


def test_the_merge_with_a_reduced_list_still_refuses_a_missing_aligned_file(tmp_path, capsys):
    handoff = three_chunks(tmp_path)
    _, out = merge_report(tmp_path, handoff, "--allow-pending-gate")
    data = tmp_path / "way2quran_reciters.json"
    exclude_by_hand(data, json.loads(out.read_text(encoding="utf-8")))
    (handoff / "aligned" / "005.json").unlink()
    code, _ = merge_manifest_with(tmp_path, handoff, data, "--data", str(data))
    assert code == 1
    assert "aligned output missing for surah(s) [5]" in capsys.readouterr().err


def test_default_chunks_for_a_blank_input_follow_the_source():
    assert ci.parse_chunks("", "mp3quran") == 6 and ci.parse_chunks(" ", "way2quran") == 20
    assert ci.parse_chunks("4", "way2quran") == 4


def test_finalize_dry_run_produces_the_pr_markdown_and_the_updated_data_file(tmp_path):
    handoff = three_chunks(tmp_path)
    code, out = merge_report(tmp_path, handoff, "--allow-pending-gate")
    assert code == 0
    report = json.loads(out.read_text(encoding="utf-8"))
    data = tmp_path / "way2quran_reciters.json"
    exclude_by_hand(data, report)
    doc = json.loads(data.read_text(encoding="utf-8"))["reciters"][0]
    assert sorted(doc["files"]) == ["1", "2", "5"] and sorted(doc["excluded"]) == ["3", "4"]

    md_path = tmp_path / "pr.md"
    assert report_mod.main(["markdown", "--report", str(out), "--out", str(md_path)]) == 0
    lines = md_path.read_text(encoding="utf-8").splitlines()
    assert lines[0].startswith("Releasable: no (rules failed: ")
    assert "| pending | 2 | 20 |" in lines
    assert "| 3 | incomplete-start | heard 1–10 | of 10 |" in lines
    assert "| 1 | pending | gate-pending | — | — | — | — | — | — | — |" in lines


@pytest.mark.skipif(not INGEST_PY.is_file(), reason="the mp3quran-ingest virtualenv is not installed")
def test_the_real_exclude_command_accepts_the_q3_report(tmp_path):
    """The workflow's exclude step, run for real against a report that carries pending surahs."""
    handoff = three_chunks(tmp_path)
    _, out = merge_report(tmp_path, handoff, "--allow-pending-gate")
    data = tmp_path / "way2quran_reciters.json"
    doc = json.loads(reciter_data(tmp_path, [1, 2, 3, 4, 5]).read_text(encoding="utf-8"))
    data.write_text(json.dumps(doc), encoding="utf-8")
    proc = subprocess.run(
        [str(INGEST_PY), "-m", "mp3quran_ingest.cli", "way2quran-exclude", "--reciter", str(RECITER),
         "--report", str(out), "--data", str(data), "--write"],
        cwd=TOOL.parent / "mp3quran-ingest", capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr
    result = json.loads(data.read_text(encoding="utf-8"))["reciters"][0]
    assert sorted(result["files"]) == ["1", "2", "5"] and sorted(result["excluded"]) == ["3", "4"]

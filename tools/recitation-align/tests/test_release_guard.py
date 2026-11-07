"""The release guard (plan way2quran-quality Q9) on fixtures in a temporary git repository.

Synthetic placeholder records only; no Quran text, no model, no network.
"""

import copy
import json
import subprocess

import pytest

from recitation_align import release_guard as G
from test_report import entry, make_report, passing_a6a, sha

RID = 3


def put(root, rel, data):
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=1), encoding="utf-8")


def timing(surah, digest):
    return {"format": 1, "kind": "way2quran", "recitation_key": str(RID), "chapter_id": surah,
            "audio": {"sha256": digest}, "ayahs": []}


def build(root, report, *, unavailable=(), a6a=True):
    """Write the full committed data set for `report` under `root`."""
    surahs = report["surahs"]
    files, excluded = [], {}
    for key, e in surahs.items():
        if e["verdict"] == "unavailable":
            excluded[key] = {"file": f"{int(key):03d}.mp3", "sha256": e["sha256"], "bytes": 1,
                             "reason": "incomplete-both"}
        else:
            files.append({"surah": int(key), "sha256": e["sha256"]})
        if e["verdict"] in ("pass", "repaired"):
            put(root, f"{G.TIMINGS_DIR}/{RID}/{int(key):03d}.json", timing(int(key), e["sha256"]))
    surah_list = sorted(f["surah"] for f in files)
    put(root, G.MANIFEST_PATH, {"schema": 1, "source": "way2quran",
                                "moshafs": [{"moshaf_id": RID, "surah_list": surah_list, "files": files}]})
    put(root, G.RECITERS_PATH, {"schema": 1, "reciters": [{"reciter_id": RID, "files": {}, "excluded": excluded}]})
    put(root, G.report_path(RID), report)
    record = {**passing_a6a(report), "date": "2026-11-08"} if a6a else None
    put(root, G.A6A_PATH, {"schema": 1, "records": [record] if record else []})


def good_report():
    surahs = {n: entry(n, "pass") for n in range(1, 11)}
    surahs[11] = entry(11, "unavailable")
    return make_report(surahs)


def git(root, *args):
    subprocess.run(["git", "-C", str(root), "-c", "user.name=t", "-c", "user.email=t@t", *args],
                   check=True, capture_output=True)


@pytest.fixture
def repo(tmp_path):
    git(tmp_path, "init", "-q")
    return tmp_path


def commit(root):
    git(root, "add", "-A")
    git(root, "commit", "-q", "-m", "x")


def problems(root, base="HEAD"):
    return G.check_reciter(root, RID, base)


def has(found, text):
    return any(text in p for p in found)


def test_a_complete_fixture_passes(repo):
    build(repo, good_report())
    commit(repo)
    assert problems(repo) == []


def test_a_base_ref_without_the_report_passes(repo):
    build(repo, good_report())
    git(repo, "commit", "-q", "--allow-empty", "-m", "empty")
    assert problems(repo) == []


def test_missing_report(repo):
    build(repo, good_report())
    (repo / G.report_path(RID)).unlink()
    commit(repo)
    assert has(problems(repo), "reciter report is missing")


def test_report_not_in_quality_mode(repo):
    report = good_report()
    report["quality_mode"] = False
    build(repo, report)
    commit(repo)
    assert has(problems(repo), "quality mode")


def test_manifest_sha_mismatch(repo):
    build(repo, good_report())
    manifest = json.loads((repo / G.MANIFEST_PATH).read_text())
    manifest["moshafs"][0]["files"][0]["sha256"] = sha("other")
    put(repo, G.MANIFEST_PATH, manifest)
    commit(repo)
    assert has(problems(repo), "differs from the manifest")


def test_the_releasable_field_is_not_trusted(repo):
    report = {n: entry(n, "pass") for n in range(1, 11)}
    report.update({n: entry(n, "no_highlight") for n in (11, 12, 13)})
    report = make_report(report)
    report["release"]["releasable"] = True
    build(repo, report)
    commit(repo)
    found = problems(repo)
    assert has(found, "release rules fail") and has(found, "R2")


def test_a_dropped_pass_fails(repo):
    earlier = good_report()
    build(repo, earlier)
    commit(repo)
    later = copy.deepcopy(earlier)
    later["surahs"]["5"] = entry(5, "unavailable")
    gone = repo / G.TIMINGS_DIR / str(RID) / "005.json"
    gone.unlink()
    build(repo, later)
    found = problems(repo)
    assert has(found, "surah 5 was pass at HEAD and has been dropped")
    assert has(found, "R6")


def test_unreadable_base_ref_fails(repo):
    build(repo, good_report())
    commit(repo)
    assert has(problems(repo, "no-such-ref"), "not a commit")


def test_missing_a6a_record(repo):
    build(repo, good_report(), a6a=False)
    commit(repo)
    assert has(problems(repo), "no passing A6(a) record")


def test_missing_a6a_file(repo):
    build(repo, good_report())
    (repo / G.A6A_PATH).unlink()
    commit(repo)
    assert has(problems(repo), "A6(a) record file is missing")


@pytest.mark.parametrize("field", ["tool_version", "params_digest", "code_digest"])
def test_a6a_version_mismatch(repo, field):
    report = good_report()
    build(repo, report)
    doc = json.loads((repo / G.A6A_PATH).read_text())
    doc["records"][0][field] = "0" * 16 if field != "tool_version" else "9.9.9+q0"
    put(repo, G.A6A_PATH, doc)
    commit(repo)
    assert has(problems(repo), "no passing A6(a) record")


def test_a_failed_a6a_record_is_not_enough(repo):
    build(repo, good_report())
    doc = json.loads((repo / G.A6A_PATH).read_text())
    doc["records"][0]["passed"] = False
    put(repo, G.A6A_PATH, doc)
    commit(repo)
    assert has(problems(repo), "no passing A6(a) record")


def test_timing_file_without_a_pass_verdict(repo):
    report = good_report()
    report["surahs"]["4"] = entry(4, "no_highlight")
    report["surahs"]["4"]["sha256"] = report["surahs"]["4"]["completeness"]["sha256"]
    build(repo, report)
    put(repo, f"{G.TIMINGS_DIR}/{RID}/004.json", timing(4, report["surahs"]["4"]["sha256"]))
    commit(repo)
    assert has(problems(repo), "surah 4 is no_highlight but has a timing file")


def test_timing_file_for_a_surah_not_in_the_report(repo):
    build(repo, good_report())
    put(repo, f"{G.TIMINGS_DIR}/{RID}/050.json", timing(50, sha("x")))
    commit(repo)
    assert has(problems(repo), "050.json has no surah in the report")


def test_pass_without_a_file(repo):
    build(repo, good_report())
    (repo / G.TIMINGS_DIR / str(RID) / "002.json").unlink()
    commit(repo)
    assert has(problems(repo), "surah 2 has no readable timing file")


def test_timing_file_with_another_audio_sha(repo):
    build(repo, good_report())
    put(repo, f"{G.TIMINGS_DIR}/{RID}/002.json", timing(2, sha("other")))
    commit(repo)
    assert has(problems(repo), "timing file audio sha256 differs")


def test_unavailable_surah_in_surah_list(repo):
    build(repo, good_report())
    manifest = json.loads((repo / G.MANIFEST_PATH).read_text())
    manifest["moshafs"][0]["surah_list"].append(11)
    manifest["moshafs"][0]["files"].append({"surah": 11, "sha256": good_report()["surahs"]["11"]["sha256"]})
    put(repo, G.MANIFEST_PATH, manifest)
    commit(repo)
    assert has(problems(repo), "surah 11 is unavailable but is in the manifest's surah_list")


def test_unavailable_surah_missing_from_excluded(repo):
    build(repo, good_report())
    reciters = json.loads((repo / G.RECITERS_PATH).read_text())
    reciters["reciters"][0]["excluded"] = {}
    put(repo, G.RECITERS_PATH, reciters)
    commit(repo)
    assert has(problems(repo), "surah 11 is unavailable but is not in excluded")


def test_unrepresented_cross_ayah_jump(repo):
    surahs = {n: entry(n, "pass") for n in range(1, 11)}
    surahs[5] = entry(5, "pass", cross=[{"ayah": 3, "represented": False}])
    build(repo, make_report(surahs))
    commit(repo)
    found = problems(repo)
    assert has(found, "R7") and has(found, "unrepresented")

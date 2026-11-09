"""Way2Quran rules of the add-reciter CI helpers (ADR 0074 decisions 6-8, plan step 8).

Offline. The plan for Way2Quran gets a RaisingApi: any call to the MP3Quran API fails the test. Names and
surah numbers are placeholders; no Quran or reciter text is read or printed.
"""

import importlib.util
import json
from pathlib import Path

import pytest

from recitation_align import ci
from recitation_align.ci import CiError

REPO = Path(__file__).resolve().parents[3]
REAL_DATA = REPO / "tools/mp3quran-ingest/mp3quran_ingest/way2quran_reciters.json"
PUBLIC_BASE = "https://audio.example.test"
HAFS = "hafs-an-asim"


class RaisingApi:
    """Stands in for the MP3Quran API. Any request is a failure: Way2Quran's plan never makes one."""

    def get_json(self, path, **params):
        raise AssertionError(f"way2quran plan called the MP3Quran API: {path}")


def reciter(rid, files, *, folder=HAFS):
    return {
        "reciter_id": rid, "slug": f"fixture-{rid}", "riwayah_folder": folder,
        "name_ar": f"قارئ تجريبي {rid}", "name_en": f"Fixture reciter {rid}", "moshaf_name": "حفص عن عاصم - مرتل",
        "page_url": f"https://way2quran.example.test/ar/reciters/fixture-{rid}",
        "files": {str(s): f"{s:03d}.mp3" for s in files},
    }


def data_fixture():
    return {
        "schema": 1,
        "reciters": [
            reciter(1, [1, 2, 3]),
            reciter(2, [1, 2], folder="warsh-an-nafi"),  # not Hafs: refused
            reciter(3, []),  # no files: refused
            reciter(4, [1, 4, 6]),  # complete when the committed manifest holds all three
            reciter(253, [1, 4, 6]),  # an MP3Quran-style id: the MP3Quran held list must not apply
        ],
    }


@pytest.fixture
def tanzil(tmp_path):
    lines = []
    for surah, sizes in {1: [10, 10], 2: [30], 3: [5, 5, 5], 4: [100], 5: [20, 20], 6: [7]}.items():
        for n, size in enumerate(sizes, start=1):
            lines.append(f"{surah}|{n}|{'x' * size}")
    path = tmp_path / "tanzil.txt"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def way2quran_plan(ids, chunks, tanzil, *, manifest=None, data=None):
    return ci.plan(RaisingApi(), ids, chunks, manifest=manifest, php_source=None, tanzil_path=tanzil,
                   source="way2quran", way2quran_data=data if data is not None else data_fixture())


# artifact names and resume

def test_artifact_names_never_meet_between_sources():
    assert ci.artifact_name("mp3quran", 253, 1) == "align-253-1"
    assert ci.artifact_name("way2quran", 1, 1) == "align-w2q-1-1"
    assert ci.artifact_name("mp3quran", 1, 1) != ci.artifact_name("way2quran", 1, 1)
    with pytest.raises(CiError, match="unknown source"):
        ci.artifact_name("qf", 1, 1)


def test_parse_done_artifacts_accepts_only_its_own_source():
    assert ci.parse_done_artifacts("align-w2q-1-2, align-w2q-1-3,", "way2quran") == {"align-w2q-1-2", "align-w2q-1-3"}
    with pytest.raises(CiError, match="unexpected artifact"):
        ci.parse_done_artifacts("align-1-2", "way2quran")
    with pytest.raises(CiError, match="unexpected artifact"):
        ci.parse_done_artifacts("align-w2q-1-2", "mp3quran")


def test_drop_done_chunks_for_way2quran_keeps_the_missing_chunks():
    entries = [{"moshaf": 1, "chunk": c, "surahs": [c]} for c in (1, 2, 3)]
    kept = ci.drop_done_chunks(entries, {"align-w2q-1-2"}, "way2quran")
    assert [e["chunk"] for e in kept] == [1, 3]
    # An MP3Quran hand-off with the same numbers does not drop a Way2Quran chunk.
    assert len(ci.drop_done_chunks(entries, {"align-1-2"}, "way2quran")) == 3


# plan (way2quran)

def test_plan_chunks_the_data_file_list_without_calling_mp3quran(tanzil):
    result = way2quran_plan([253], 2, tanzil)
    assert result["moshafs"] == [253]
    assert [e["chunk"] for e in result["chunks"]] == [1, 2]
    assert sorted(s for e in result["chunks"] for s in e["surahs"]) == [1, 4, 6]
    assert set(result["chunks"][0]) == {"moshaf", "chunk", "surahs"}


def test_plan_ignores_the_mp3quran_php_source_for_way2quran(tanzil):
    result = ci.plan(RaisingApi(), [253], 1, manifest=None, php_source="<?php not read ?>", tanzil_path=tanzil,
                     source="way2quran", way2quran_data=data_fixture())
    assert sorted(result["chunks"][0]["surahs"]) == [1, 4, 6]


@pytest.mark.parametrize("ids, text", [
    ([999], "not in the Way2Quran reciter data file"),
    ([2], "has no Hafs files"),
    ([3], "has no Hafs files"),
])
def test_plan_way2quran_refuses(tanzil, ids, text):
    with pytest.raises(CiError, match=text):
        way2quran_plan(ids, 2, tanzil)


def test_plan_way2quran_refuses_a_complete_committed_reciter(tanzil):
    manifest = {"moshafs": [{"moshaf_id": 4, "files": [{"surah": s} for s in (1, 4, 6)]}]}
    with pytest.raises(CiError, match="already in the committed Way2Quran manifest"):
        way2quran_plan([4], 1, tanzil, manifest=manifest)


def test_plan_way2quran_allows_a_partial_committed_reciter(tanzil):
    manifest = {"moshafs": [{"moshaf_id": 4, "files": [{"surah": 1}]}]}
    result = way2quran_plan([4], 1, tanzil, manifest=manifest)
    assert result["chunks"][0]["surahs"] == [1, 4, 6]


def test_plan_way2quran_collects_every_refusal(tanzil):
    with pytest.raises(CiError) as err:
        way2quran_plan([2, 3, 999], 2, tanzil)
    message = str(err.value)
    assert message.startswith("refused: ")
    assert "has no Hafs files" in message and "not in the Way2Quran reciter data file" in message
    assert message.count("has no Hafs files") == 2


def test_plan_way2quran_needs_its_data(tanzil):
    with pytest.raises(CiError, match="way2quran_data is needed"):
        ci.plan(RaisingApi(), [1], 1, manifest=None, php_source=None, tanzil_path=tanzil, source="way2quran")


def test_plan_refuses_an_unknown_source(tanzil):
    with pytest.raises(CiError, match="unknown source"):
        ci.plan(RaisingApi(), [1], 1, manifest=None, php_source=None, tanzil_path=tanzil, source="qf")


def test_way2quran_data_file_rejects_a_bad_schema_and_a_repeated_id(tanzil):
    with pytest.raises(CiError, match="not schema 1"):
        way2quran_plan([1], 1, tanzil, data={"schema": 2, "reciters": []})
    doubled = {"schema": 1, "reciters": [reciter(1, [1]), reciter(1, [2])]}
    with pytest.raises(CiError, match="listed twice"):
        way2quran_plan([1], 1, tanzil, data=doubled)


def test_real_data_file_plans_both_reciters_without_network(tanzil):
    data = json.loads(REAL_DATA.read_text(encoding="utf-8"))
    result = way2quran_plan([1, 2], 3, tanzil, data=data)
    counts = {}
    for entry in result["chunks"]:
        counts[entry["moshaf"]] = counts.get(entry["moshaf"], 0) + len(entry["surahs"])
    # a quality run moves the surahs it finds incomplete to `excluded` (ADR 0077), so the counts follow the data file
    by_id = {r["reciter_id"]: r for r in data["reciters"]}
    expected = {i: len(set(by_id[i]["files"]) - set(by_id[i].get("excluded") or {})) for i in (1, 2)}
    assert counts == expected and expected[2] == 54 and expected[1] >= 100


# merge (way2quran)

def part_w2q(rid, files, *, surah_list=None, public_base=PUBLIC_BASE, source="way2quran"):
    listed = surah_list if surah_list is not None else [1, 2, 3]
    return {
        "schema": 1, "source": source, "generated_at": "2026-11-07T10:00:00Z", "public_base": public_base,
        "moshafs": [{"moshaf_id": rid, "reciter_id": rid, "name_ar": "قارئ تجريبي", "name_en": "Fixture",
                     "riwayah": "حفص عن عاصم", "moshaf_name": "x", "surah_list": sorted(listed),
                     "files": [file_entry(rid, s) for s in files]}],
    }


def file_entry(rid, surah):
    return {"surah": surah, "key": f"audio/way2quran/{rid}/{surah:03d}-bbbbbbbbbbbbbbbb.mp3",
            "url": f"{PUBLIC_BASE}/audio/way2quran/{rid}/{surah:03d}-bbbbbbbbbbbbbbbb.mp3",
            "bytes": 10, "sha256": "b" * 64, "duration_ms": 1000,
            "source_url": f"https://media.way2quran.example.test/x/{surah:03d}.mp3",
            "source_etag": None, "source_last_modified": "Wed, 01 Jan 2025 00:00:00 GMT"}


def test_merge_way2quran_creates_the_manifest_when_absent():
    merged = ci.merge_manifest(None, [part_w2q(1, [1, 2, 3])], 1, "way2quran")
    assert merged["source"] == "way2quran"
    assert [r["moshaf_id"] for r in merged["moshafs"]] == [1]
    assert [f["surah"] for f in merged["moshafs"][0]["files"]] == [1, 2, 3]


def test_merge_way2quran_accepts_exactly_a_54_surah_list():
    listed = list(range(1, 55))
    parts = [part_w2q(2, listed[:20], surah_list=listed), part_w2q(2, listed[20:], surah_list=listed)]
    merged = ci.merge_manifest(None, parts, 2, "way2quran")
    assert [f["surah"] for f in merged["moshafs"][0]["files"]] == listed


def test_merge_way2quran_refuses_a_missing_or_doubled_surah():
    with pytest.raises(CiError, match="missing surah"):
        ci.merge_manifest(None, [part_w2q(1, [1, 2])], 1, "way2quran")
    with pytest.raises(CiError, match="two parts"):
        ci.merge_manifest(None, [part_w2q(1, [1, 2, 3]), part_w2q(1, [3])], 1, "way2quran")


def test_merge_refuses_a_part_from_the_other_source():
    with pytest.raises(CiError, match="not a Way2Quran manifest"):
        ci.merge_manifest(None, [part_w2q(1, [1, 2, 3], source="mp3quran")], 1, "way2quran")
    with pytest.raises(CiError, match="not an mp3quran manifest"):
        ci.merge_manifest(None, [part_w2q(1, [1, 2, 3])], 1, "mp3quran")


def test_merge_refuses_a_committed_manifest_of_the_other_source():
    committed = {"schema": 1, "source": "mp3quran", "public_base": PUBLIC_BASE, "moshafs": []}
    with pytest.raises(CiError, match="committed manifest is not"):
        ci.merge_manifest(committed, [part_w2q(1, [1, 2, 3])], 1, "way2quran")


def test_merge_way2quran_leaves_other_reciters_in_place():
    other = part_w2q(2, [1], surah_list=[1])
    committed = ci.merge_manifest(None, [other], 2, "way2quran")
    merged = ci.merge_manifest(committed, [part_w2q(1, [1, 2, 3])], 1, "way2quran")
    assert [r["moshaf_id"] for r in merged["moshafs"]] == [1, 2]
    assert ci.encode_manifest({"moshafs": [merged["moshafs"][1]]}) == ci.encode_manifest({"moshafs": committed["moshafs"]})


# scripts (dry runs on fixtures)

def load_script(name):
    path = REPO / "tools/recitation-align/scripts" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_ci_plan_script_way2quran_builds_no_api_and_writes_the_output(tmp_path, tanzil, monkeypatch):
    def no_api():
        raise AssertionError("ci_plan built an MP3Quran API client for way2quran")

    monkeypatch.setattr(ci, "Api", no_api)
    data = tmp_path / "way2quran_reciters.json"
    data.write_text(json.dumps(data_fixture()), encoding="utf-8")
    output = tmp_path / "out.txt"
    monkeypatch.setenv("GITHUB_OUTPUT", str(output))
    code = load_script("ci_plan").main(["--source", "way2quran", "--moshafs", "253", "--chunks", "2",
                                        "--data", str(data), "--manifest", str(tmp_path / "none.json"),
                                        "--tanzil", str(tanzil)])
    assert code == 0
    lines = dict(line.split("=", 1) for line in output.read_text(encoding="utf-8").splitlines())
    assert json.loads(lines["moshafs"]) == [253]
    assert sorted(s for e in json.loads(lines["chunks"]) for s in e["surahs"]) == [1, 4, 6]


def test_ci_plan_script_way2quran_refusal_exits_non_zero(tmp_path, tanzil, monkeypatch, capsys):
    monkeypatch.setattr(ci, "Api", lambda: RaisingApi())
    data = tmp_path / "way2quran_reciters.json"
    data.write_text(json.dumps(data_fixture()), encoding="utf-8")
    code = load_script("ci_plan").main(["--source", "way2quran", "--moshafs", "999", "--data", str(data),
                                        "--manifest", str(tmp_path / "none.json"), "--tanzil", str(tanzil)])
    assert code == 1
    assert "not in the Way2Quran reciter data file" in capsys.readouterr().err


def test_ci_plan_script_way2quran_resume_uses_its_own_names(tmp_path, tanzil, monkeypatch):
    monkeypatch.setattr(ci, "Api", lambda: RaisingApi())
    data = tmp_path / "way2quran_reciters.json"
    data.write_text(json.dumps(data_fixture()), encoding="utf-8")
    output = tmp_path / "out.txt"
    monkeypatch.setenv("GITHUB_OUTPUT", str(output))
    code = load_script("ci_plan").main(["--source", "way2quran", "--moshafs", "253", "--chunks", "3",
                                        "--done", "align-w2q-253-1", "--data", str(data),
                                        "--manifest", str(tmp_path / "none.json"), "--tanzil", str(tanzil)])
    assert code == 0
    chunks = json.loads(dict(line.split("=", 1) for line in output.read_text().splitlines())["chunks"])
    assert 1 not in [e["chunk"] for e in chunks]


def test_ci_merge_manifest_script_way2quran_creates_the_committed_file(tmp_path):
    parts = tmp_path / "parts"
    aligned = tmp_path / "aligned"
    parts.mkdir()
    aligned.mkdir()
    (parts / "manifest-1-1.json").write_text(json.dumps(part_w2q(1, [1, 2])), encoding="utf-8")
    (parts / "manifest-1-2.json").write_text(json.dumps(part_w2q(1, [3])), encoding="utf-8")
    for s in (1, 2, 3):
        (aligned / f"{s:03d}.json").write_text("{}", encoding="utf-8")
    target = tmp_path / "way2quran" / "manifest.json"
    code = load_script("ci_merge_manifest").main(["--source", "way2quran", "--moshaf", "1", "--parts", str(parts),
                                                  "--aligned", str(aligned), "--manifest", str(target)])
    assert code == 0
    written = json.loads(target.read_text(encoding="utf-8"))
    assert written["source"] == "way2quran"
    assert [f["surah"] for f in written["moshafs"][0]["files"]] == [1, 2, 3]


def test_ci_merge_manifest_script_way2quran_refuses_a_partial_reciter(tmp_path, capsys):
    parts = tmp_path / "parts"
    aligned = tmp_path / "aligned"
    parts.mkdir()
    aligned.mkdir()
    (parts / "manifest-1-1.json").write_text(json.dumps(part_w2q(1, [1, 2])), encoding="utf-8")
    target = tmp_path / "way2quran" / "manifest.json"
    code = load_script("ci_merge_manifest").main(["--source", "way2quran", "--moshaf", "1", "--parts", str(parts),
                                                  "--aligned", str(aligned), "--manifest", str(target)])
    assert code == 1
    assert "missing surah" in capsys.readouterr().err
    assert not target.exists()


def test_ci_quality_script_way2quran_reads_its_own_manifest(tmp_path):
    manifest = tmp_path / "way2quran.json"
    manifest.write_text(json.dumps(
        {"schema": 1, "source": "way2quran", "public_base": PUBLIC_BASE,
         "moshafs": [{"moshaf_id": 1, "surah_list": [1], "files": [file_entry(1, 1)]}]}), encoding="utf-8")
    aligned = tmp_path / "aligned"
    aligned.mkdir()
    doc = {"source": "aligner", "ayahs": [{"ayah": 1}], "words": [{"ayah": 1, "confidence": 0.9}]}
    (aligned / "001.json").write_text(json.dumps(doc), encoding="utf-8")
    out = tmp_path / "quality.md"
    code = load_script("ci_quality").main(["--source", "way2quran", "--moshaf", "1", "--aligned", str(aligned),
                                           "--manifest", str(manifest), "--out", str(out)])
    assert code == 0
    assert "| 1 | aligner | 1 | 1 | 0.900 | 0 |" in out.read_text(encoding="utf-8")


# calibration plan (plan Q10, P9)

CALIBRATION = {"schema": 1, "reciters": {"1": [1, 3], "4": [6, 4]}}


def test_calibration_plan_is_one_chunk_per_reciter_from_the_file():
    result = ci.plan_calibration([1, 4], CALIBRATION, data=data_fixture())
    assert result == {"chunks": [{"moshaf": 1, "chunk": 1, "surahs": [1, 3]},
                                 {"moshaf": 4, "chunk": 1, "surahs": [4, 6]}], "moshafs": [1, 4]}


def test_calibration_plan_ignores_the_committed_manifest_and_calls_no_api():
    # reciter 4 is complete in a committed manifest, which a normal plan refuses; calibration uploads nothing.
    assert ci.plan_calibration([4], CALIBRATION, data=data_fixture())["chunks"][0]["surahs"] == [4, 6]


@pytest.mark.parametrize("ids, text", [
    ([2], "reciter 2 is not in the calibration file"),
    ([999], "reciter 999 is not in the calibration file"),
])
def test_calibration_plan_refuses_an_id_that_is_not_in_the_file(ids, text):
    with pytest.raises(CiError, match=text):
        ci.plan_calibration(ids, CALIBRATION, data=data_fixture())


def test_calibration_plan_refuses_a_surah_the_data_file_does_not_list():
    doc = {"schema": 1, "reciters": {"1": [1, 5]}}
    with pytest.raises(CiError, match=r"calibration surah\(s\) \[5\]"):
        ci.plan_calibration([1], doc, data=data_fixture())


@pytest.mark.parametrize("doc", [
    [], {"schema": 2, "reciters": {}}, {"schema": 1, "reciters": {"x": [1]}},
    {"schema": 1, "reciters": {"1": []}}, {"schema": 1, "reciters": {"1": [1, 1]}},
    {"schema": 1, "reciters": {"1": [0]}}, {"schema": 1, "reciters": {"1": [True]}},
])
def test_calibration_file_is_validated(doc):
    with pytest.raises(CiError):
        ci.calibration_surahs(doc)


def test_the_committed_calibration_file_lists_the_plan_surahs():
    doc = json.loads((REPO / ci.CALIBRATION_PATH).read_text(encoding="utf-8"))
    assert ci.calibration_surahs(doc) == {1: [5, 9], 3: [15, 16, 18, 19, 23, 55]}
    result = ci.plan_calibration([1, 3], doc, data=json.loads(REAL_DATA.read_text(encoding="utf-8")))
    assert [(c["moshaf"], c["chunk"]) for c in result["chunks"]] == [(1, 1), (3, 1)]


def calibration_args(tmp_path, tanzil, *extra, ids="1,4"):
    data = tmp_path / "data.json"
    data.write_text(json.dumps(data_fixture()), encoding="utf-8")
    file = tmp_path / "calibration.json"
    file.write_text(json.dumps(CALIBRATION), encoding="utf-8")
    return ["--source", "way2quran", "--moshafs", ids, "--data", str(data), "--tanzil", str(tanzil),
            "--calibration-file", str(file), *extra]


def test_ci_plan_script_calibrate_writes_the_output(tmp_path, tanzil, monkeypatch):
    out = tmp_path / "gh_output"
    monkeypatch.setenv("GITHUB_OUTPUT", str(out))
    monkeypatch.delenv("QUALITY", raising=False)
    code = load_script("ci_plan").main(calibration_args(tmp_path, tanzil, "--quality", "--calibrate"))
    assert code == 0
    lines = out.read_text(encoding="utf-8").splitlines()
    assert json.loads(lines[0].removeprefix("chunks=")) == [
        {"moshaf": 1, "chunk": 1, "surahs": [1, 3]}, {"moshaf": 4, "chunk": 1, "surahs": [4, 6]}]


def test_ci_plan_script_calibrate_from_the_environment_like_the_workflow(tmp_path, tanzil, monkeypatch):
    monkeypatch.setenv("QUALITY", "true")
    monkeypatch.setenv("CALIBRATE", "true")
    monkeypatch.delenv("GITHUB_OUTPUT", raising=False)
    assert load_script("ci_plan").main(calibration_args(tmp_path, tanzil)) == 0


@pytest.mark.parametrize("flags, env, text", [
    ([], {"CALIBRATE": "true"}, "way2quran source with quality mode only"),
    (["--calibrate"], {}, "way2quran source with quality mode only"),
    (["--quality", "--calibrate", "--chunks", "3"], {}, "leave chunks empty"),
])
def test_ci_plan_script_calibrate_refusals(tmp_path, tanzil, monkeypatch, capsys, flags, env, text):
    monkeypatch.delenv("QUALITY", raising=False)
    monkeypatch.delenv("CALIBRATE", raising=False)
    for key, value in env.items():
        monkeypatch.setenv(key, value)
    assert load_script("ci_plan").main(calibration_args(tmp_path, tanzil, *flags)) == 1
    assert text in capsys.readouterr().err


def test_ci_plan_script_calibrate_refuses_an_id_not_in_the_file(tmp_path, tanzil, monkeypatch, capsys):
    monkeypatch.delenv("QUALITY", raising=False)
    monkeypatch.delenv("CALIBRATE", raising=False)
    code = load_script("ci_plan").main(calibration_args(tmp_path, tanzil, "--quality", "--calibrate", ids="2"))
    assert code == 1
    assert "not in the calibration file" in capsys.readouterr().err


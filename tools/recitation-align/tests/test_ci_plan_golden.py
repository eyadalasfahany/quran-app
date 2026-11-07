"""Golden plan output of `scripts/ci_plan.py` for both sources (plan step Q0, T-baselines for P2).

A fake MP3Quran API and a fake Way2Quran data file; the surah lengths come from the repository's Tanzil file
at test time (only the lengths are used, nothing is copied). The golden holds surah numbers and ids only.
`UPDATE_GOLDEN=1` rewrites the golden files; a normal run only compares.
"""

import importlib.util
import json
import os
from pathlib import Path

import pytest

from recitation_align import ci

TOOL = Path(__file__).resolve().parents[1]
REPO = TOOL.parents[1]
TANZIL = REPO / "packages/quran-text-check/data/tanzil-quran-simple-1.1.txt"
GOLDEN = Path(__file__).parent / "golden" / "plan"
SERVER = "https://cdn.example.test/audio/fixture-reciter/r1/"
ALL = ",".join(str(n) for n in range(1, 115))
PHP = """<?php return [
    'mp3quran_duplicates' => [50 => 7],
    'mp3quran_held_moshafs' => [253],
];"""


class FakeApi:
    def get_json(self, path, **params):
        if path == "reciters":
            return {"reciters": [{"id": 7, "moshaf": [
                {"id": 86, "rewaya_id": 1, "server": SERVER, "surah_list": ALL, "name": "x"}]}]}
        if path == "ayat_timing/reads":
            return [{"id": 9, "folder_url": SERVER.rstrip("/"), "soar_count": 114}]
        raise AssertionError(path)


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, TOOL / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def way2quran_data():
    return {"schema": 1, "reciters": [{
        "reciter_id": 5, "slug": "fixture-5", "riwayah_folder": "hafs-an-asim",
        "files": {str(n): f"{n:03d}.mp3" for n in range(1, 115)}}]}


def run(tmp_path, monkeypatch, capsys, argv):
    output = tmp_path / "github-output.txt"
    monkeypatch.setenv("GITHUB_OUTPUT", str(output))
    code = load_script("ci_plan").main(argv)
    assert code == 0
    printed = capsys.readouterr().out
    return {"stdout": printed, "github_output": output.read_text(encoding="utf-8")}


def check(name, produced):
    path = GOLDEN / f"{name}.json"
    text = json.dumps(produced, indent=2, ensure_ascii=False) + "\n"
    if os.environ.get("UPDATE_GOLDEN") == "1":
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    assert path.read_text(encoding="utf-8") == text


@pytest.mark.parametrize("chunks", ["6", "3"])
def test_mp3quran_plan_matches_the_golden(tmp_path, monkeypatch, capsys, chunks):
    monkeypatch.setattr(ci, "Api", FakeApi)
    php = tmp_path / "quran.php"
    php.write_text(PHP, encoding="utf-8")
    produced = run(tmp_path, monkeypatch, capsys, [
        "--moshafs", "86", "--chunks", chunks, "--manifest", str(tmp_path / "none.json"),
        "--php", str(php), "--tanzil", str(TANZIL)])
    check(f"mp3quran-chunks-{chunks}", produced)


@pytest.mark.parametrize("chunks", ["20", "6"])
def test_way2quran_plan_matches_the_golden(tmp_path, monkeypatch, capsys, chunks):
    monkeypatch.setattr(ci, "Api", lambda: pytest.fail("the Way2Quran plan must not build an API client"))
    data = tmp_path / "reciters.json"
    data.write_text(json.dumps(way2quran_data()), encoding="utf-8")
    produced = run(tmp_path, monkeypatch, capsys, [
        "--source", "way2quran", "--moshafs", "5", "--chunks", chunks, "--manifest", str(tmp_path / "none.json"),
        "--data", str(data), "--tanzil", str(TANZIL)])
    check(f"way2quran-chunks-{chunks}", produced)


# P2: the chunks input's default is empty; the plan maps it per source (plan way2quran-quality Q3).

def test_an_empty_chunks_input_gives_the_mp3quran_plan_of_six(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(ci, "Api", FakeApi)
    php = tmp_path / "quran.php"
    php.write_text(PHP, encoding="utf-8")
    produced = run(tmp_path, monkeypatch, capsys, [
        "--moshafs", "86", "--chunks", "", "--manifest", str(tmp_path / "none.json"),
        "--php", str(php), "--tanzil", str(TANZIL)])
    check("mp3quran-chunks-6", produced)


def test_an_empty_chunks_input_gives_the_way2quran_plan_of_twenty(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(ci, "Api", lambda: pytest.fail("the Way2Quran plan must not build an API client"))
    data = tmp_path / "reciters.json"
    data.write_text(json.dumps(way2quran_data()), encoding="utf-8")
    produced = run(tmp_path, monkeypatch, capsys, [
        "--source", "way2quran", "--moshafs", "5", "--chunks", "", "--manifest", str(tmp_path / "none.json"),
        "--data", str(data), "--tanzil", str(TANZIL)])
    check("way2quran-chunks-20", produced)


def test_quality_mode_leaves_the_way2quran_plan_unchanged(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(ci, "Api", lambda: pytest.fail("the Way2Quran plan must not build an API client"))
    data = tmp_path / "reciters.json"
    data.write_text(json.dumps(way2quran_data()), encoding="utf-8")
    base = ["--source", "way2quran", "--moshafs", "5", "--manifest", str(tmp_path / "none.json"),
            "--data", str(data), "--tanzil", str(TANZIL)]
    monkeypatch.setenv("QUALITY", "true")  # how the workflow passes it (P16)
    produced = run(tmp_path, monkeypatch, capsys, base)
    check("way2quran-chunks-20", produced)
    monkeypatch.delenv("QUALITY")
    assert run(tmp_path, monkeypatch, capsys, [*base, "--quality"])["stdout"] == produced["stdout"]


def test_quality_mode_is_refused_for_mp3quran(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(ci, "Api", FakeApi)
    monkeypatch.setenv("QUALITY", "true")
    code = load_script("ci_plan").main(["--moshafs", "86", "--manifest", str(tmp_path / "none.json"),
                                        "--tanzil", str(TANZIL)])
    assert code == 1 and "way2quran source only" in capsys.readouterr().err

"""CLI for Way2Quran (ADR 0074 decision 9; plan steps 5 and 6): source switches, refusals, dry run, upload, lister. No network."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

import mp3quran_ingest.cli as cli
import mp3quran_ingest.way2quran as w2q
from mp3quran_ingest.cli import main
from mp3quran_ingest.store import R2Store

from .conftest import BUCKET, SECRET
from .fake_way2quran import way2quran_host  # noqa: F401 - fixture
from .fake_way2quran import FakeWay2Quran, file_path, page_path
from .test_way2quran_data import entry, write_data
from .test_way2quran_list import page_html

ACCOUNT = "acct123"
AKID = "AKIDTEST"


@pytest.fixture
def data_file(tmp_path: Path) -> Path:
    return write_data(tmp_path / "data.json", [entry()])


@pytest.fixture
def staged_host(way2quran_host: FakeWay2Quran, real_mp3: bytes) -> FakeWay2Quran:
    """The real duration measure runs in the CLI, so the staged files are real (ffmpeg-made) mp3 bytes."""
    for name in ("001.mp3", "012.mp3", "79.mp3"):
        way2quran_host.files[file_path("fixture-reciter", name)] = real_mp3
    return way2quran_host


def no_env(tmp_path: Path) -> str:
    return str(tmp_path / "none.env")


# --- source switches and refusals -------------------------------------------------------------

def test_way2quran_needs_a_reciter(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert main(["ingest", "--source", "way2quran", "--env-file", no_env(tmp_path)]) == 1
    assert "--reciter is required" in capsys.readouterr().err


def test_way2quran_refuses_a_moshaf(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    code = main(["ingest", "--source", "way2quran", "--reciter", "1", "--moshaf", "253",
                 "--env-file", no_env(tmp_path)])
    assert code == 1
    assert "--moshaf applies only to --source mp3quran" in capsys.readouterr().err


def test_mp3quran_needs_a_moshaf_and_refuses_a_reciter(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert main(["ingest", "--env-file", no_env(tmp_path)]) == 1
    assert "--moshaf is required" in capsys.readouterr().err
    assert main(["ingest", "--moshaf", "253", "--reciter", "1", "--env-file", no_env(tmp_path)]) == 1
    assert "--reciter applies only to --source way2quran" in capsys.readouterr().err


@pytest.mark.parametrize("extra", [[], ["--upload"]])
def test_via_worker_is_refused_for_way2quran_even_before_credentials(
    tmp_path: Path, capsys: pytest.CaptureFixture[str], extra: list[str]
) -> None:
    code = main(["ingest", "--source", "way2quran", "--reciter", "1", "--via", "worker",
                 "--env-file", no_env(tmp_path), *extra])
    assert code == 1
    assert "pinned to MP3Quran" in capsys.readouterr().err


def test_an_unknown_reciter_is_refused(tmp_path: Path, data_file: Path, capsys: pytest.CaptureFixture[str]) -> None:
    code = main(["ingest", "--source", "way2quran", "--reciter", "7", "--data", str(data_file),
                 "--env-file", no_env(tmp_path)])
    assert code == 1
    assert "reciter 7 is not in the Way2Quran reciter data file" in capsys.readouterr().err


# --- dry run -----------------------------------------------------------------------------------

def test_dry_run_writes_a_way2quran_manifest_and_builds_no_s3_client(
    tmp_path: Path, staged_host: FakeWay2Quran, data_file: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(w2q, "MEDIA_BASE", staged_host.host)

    def no_client(settings: Any) -> None:
        raise AssertionError("a dry run must not build an S3 client")

    monkeypatch.setattr(cli, "make_store", no_client)
    manifest = tmp_path / "m.json"
    code = main(["ingest", "--source", "way2quran", "--reciter", "1", "--data", str(data_file),
                 "--manifest", str(manifest), "--work-dir", str(tmp_path / "w"),
                 "--env-file", no_env(tmp_path)])
    assert code == 0
    data = json.loads(manifest.read_text(encoding="utf-8"))
    assert data["source"] == "way2quran"
    assert [f["surah"] for f in data["moshafs"][0]["files"]] == [1, 12, 79]
    assert data["moshafs"][0]["moshaf_id"] == 1
    assert {f["key"].split("/")[1] for f in data["moshafs"][0]["files"]} == {"way2quran"}


def test_dry_run_default_manifest_is_the_way2quran_dry_file(
    tmp_path: Path, staged_host: FakeWay2Quran, data_file: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from mp3quran_ingest import config

    target = tmp_path / "dry-way2quran.json"
    monkeypatch.setattr(config, "DEFAULT_DRY_WAY2QURAN_MANIFEST", target)
    monkeypatch.setattr(cli, "DEFAULT_DRY_WAY2QURAN_MANIFEST", target)
    monkeypatch.setattr(w2q, "MEDIA_BASE", staged_host.host)
    code = main(["ingest", "--source", "way2quran", "--reciter", "1", "--data", str(data_file),
                 "--work-dir", str(tmp_path / "w"), "--env-file", no_env(tmp_path)])
    assert code == 0
    assert target.is_file()


# --- upload (s3 only) --------------------------------------------------------------------------

def test_upload_copies_with_s3_under_the_way2quran_prefix(
    tmp_path: Path, staged_host: FakeWay2Quran, data_file: Path, s3_client: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("R2_ACCOUNT_ID", ACCOUNT)
    monkeypatch.setenv("R2_ACCESS_KEY_ID", AKID)
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", SECRET)
    monkeypatch.setattr(w2q, "MEDIA_BASE", staged_host.host)
    monkeypatch.setattr(cli, "make_store", lambda settings: R2Store(settings, client=s3_client))
    manifest = tmp_path / "m.json"
    code = main(["ingest", "--source", "way2quran", "--reciter", "1", "--data", str(data_file), "--upload",
                 "--manifest", str(manifest), "--work-dir", str(tmp_path / "w"), "--env-file", no_env(tmp_path)])
    assert code == 0
    listed = s3_client.list_objects_v2(Bucket=BUCKET, Prefix="audio/way2quran/1/")
    keys = sorted(item["Key"] for item in listed["Contents"])
    assert len(keys) == 3
    assert all(key.startswith("audio/way2quran/1/") for key in keys)
    assert not any(key.startswith("audio/mp3quran/") for key in keys)


# --- the lister command ------------------------------------------------------------------------

def lister_args(data: Path, *extra: str) -> list[str]:
    return ["way2quran-list", "--slug", "fixture-reciter", "--reciter-id", "1",
            "--name-ar", "قارئ تجريبي للاختبار", "--name-en", "Fixture Reciter", "--data", str(data), *extra]


def test_lister_without_write_prints_and_writes_nothing(
    tmp_path: Path, staged_host: FakeWay2Quran, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(w2q, "SITE_BASE", staged_host.host)
    monkeypatch.setattr(w2q, "MEDIA_BASE", staged_host.host)
    staged_host.pages[page_path("fixture-reciter")] = page_html(staged_host.host, "fixture-reciter",
                                                                ["001.mp3", "012.mp3", "79.mp3"], ["001.mp3"])
    data = tmp_path / "data.json"
    assert main(lister_args(data)) == 0
    out = capsys.readouterr().out
    assert "3 Hafs file(s) listed, 1 other-riwayah file(s) ignored" in out
    assert "surah_list: 1,12,79" in out
    assert "total bytes:" in out
    assert "dry: nothing written" in out
    assert not data.exists()


def test_lister_write_records_the_entry(
    tmp_path: Path, staged_host: FakeWay2Quran, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(w2q, "SITE_BASE", staged_host.host)
    monkeypatch.setattr(w2q, "MEDIA_BASE", staged_host.host)
    staged_host.pages[page_path("fixture-reciter")] = page_html(staged_host.host, "fixture-reciter",
                                                                ["001.mp3", "012.mp3", "79.mp3"])
    data = tmp_path / "data.json"
    assert main(lister_args(data, "--write")) == 0
    saved = json.loads(data.read_text(encoding="utf-8"))
    assert [r["reciter_id"] for r in saved["reciters"]] == [1]
    assert saved["reciters"][0]["files"] == {"1": "001.mp3", "12": "012.mp3", "79": "79.mp3"}
    assert "written:" in capsys.readouterr().out


def test_lister_reports_a_missing_page_and_exits_1(
    tmp_path: Path, staged_host: FakeWay2Quran, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(w2q, "SITE_BASE", staged_host.host)
    assert main(lister_args(tmp_path / "data.json")) == 1
    assert "reciter page request failed" in capsys.readouterr().err

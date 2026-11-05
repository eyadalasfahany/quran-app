"""CLI modes: dry run by default, --upload required for any write, --via worker|s3, MODE line. No network."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import boto3
import pytest

import mp3quran_ingest.cli as cli
import mp3quran_ingest.worker as worker_module
from mp3quran_ingest.cli import main
from mp3quran_ingest.store import R2Store

from .conftest import BUCKET, SECRET, WORKER_TOKEN
from .fake_mp3quran import FakeMp3Quran
from .fake_worker import FakeWorker

ONE = "/audio/test-one/059.mp3"
ACCOUNT = "acct123"
AKID = "AKIDTEST"


def set_full_credentials(monkeypatch: pytest.MonkeyPatch, worker: FakeWorker) -> None:
    monkeypatch.setenv("R2_ACCOUNT_ID", ACCOUNT)
    monkeypatch.setenv("R2_ACCESS_KEY_ID", AKID)
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", SECRET)
    monkeypatch.setenv("R2_COPY_WORKER_URL", worker.url)
    monkeypatch.setenv("R2_COPY_TOKEN", WORKER_TOKEN)


@pytest.fixture
def mocked_r2(s3_client: Any, monkeypatch: pytest.MonkeyPatch) -> Any:
    """Route the CLI's store to the moto bucket. Any other S3 client build fails the test."""
    monkeypatch.setattr(cli, "make_store", lambda settings: R2Store(settings, client=s3_client))
    return s3_client


def base_args(tmp_path: Path, fake_server: FakeMp3Quran, *extra: str) -> list[str]:
    return [
        "ingest", "--moshaf", "900", "--surah", "59",
        "--manifest", str(tmp_path / "m.json"), "--work-dir", str(tmp_path / "w"),
        "--api-base", fake_server.api_base, "--env-file", str(tmp_path / "none.env"),
        *extra,
    ]


def test_default_is_a_dry_run_even_with_full_credentials(
    tmp_path: Path, fake_server: FakeMp3Quran, real_mp3: bytes, fake_worker: FakeWorker,
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
) -> None:
    set_full_credentials(monkeypatch, fake_worker)
    fake_server.files[ONE] = real_mp3
    calls: list[str] = []

    def counted(*_args: Any, **_kwargs: Any) -> None:
        calls.append("boto3.client")
        raise AssertionError("dry run must not create an S3 client")

    def counted_store(_settings: Any) -> None:
        calls.append("make_store")
        raise AssertionError("dry run must not build a store")

    monkeypatch.setattr(boto3, "client", counted)
    monkeypatch.setattr(cli, "make_store", counted_store)
    assert main(base_args(tmp_path, fake_server)) == 0

    out = capsys.readouterr().out
    assert out.splitlines()[0] == "MODE: dry run (no uploads)"
    assert "nothing uploaded" in out and "uploaded 0" not in out
    assert calls == [] and fake_worker.requests == []
    assert (tmp_path / "m.json").is_file()


def test_dry_run_with_full_credentials_in_the_env_file_still_writes_nothing(
    tmp_path: Path, fake_server: FakeMp3Quran, real_mp3: bytes, fake_worker: FakeWorker,
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
) -> None:
    """The .env path itself: every R2 name set in a file, the way the developer's real file is set up."""
    env_file = tmp_path / ".env"
    env_file.write_text(
        f"R2_ACCOUNT_ID={ACCOUNT}\nR2_ACCESS_KEY_ID={AKID}\nR2_SECRET_ACCESS_KEY={SECRET}\n"
        f"R2_BUCKET=quran\nR2_PUBLIC_BASE=https://audio.taybah-app.com\n"
        f"R2_COPY_WORKER_URL={fake_worker.url}\nR2_COPY_TOKEN={WORKER_TOKEN}\n",
        encoding="utf-8",
    )
    fake_server.files[ONE] = real_mp3
    calls: list[str] = []

    def counted(*_args: Any, **_kwargs: Any) -> None:
        calls.append("boto3.client")
        raise AssertionError("dry run must not create an S3 client")

    def counted_store(_settings: Any) -> None:
        calls.append("make_store")
        raise AssertionError("dry run must not build a store")

    monkeypatch.setattr(boto3, "client", counted)
    monkeypatch.setattr(cli, "make_store", counted_store)
    args = [
        "ingest", "--moshaf", "900", "--surah", "59", "--manifest", str(tmp_path / "m.json"),
        "--work-dir", str(tmp_path / "w"), "--api-base", fake_server.api_base, "--env-file", str(env_file),
    ]
    assert main(args) == 0
    out = capsys.readouterr().out
    assert out.splitlines()[0] == "MODE: dry run (no uploads)"
    assert calls == [] and fake_worker.requests == []
    assert SECRET not in out and WORKER_TOKEN not in out


def test_default_manifest_for_a_dry_run_is_the_dry_path(
    tmp_path: Path, fake_server: FakeMp3Quran, real_mp3: bytes, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_server.files[ONE] = real_mp3
    dry_default = tmp_path / "out" / "dry-manifest.json"
    committed = tmp_path / "committed" / "manifest.json"
    monkeypatch.setattr(cli, "DEFAULT_DRY_MANIFEST", dry_default)
    monkeypatch.setattr(cli, "DEFAULT_MANIFEST", committed)
    assert main(["ingest", "--moshaf", "900", "--surah", "59", "--work-dir", str(tmp_path / "w"),
                 "--api-base", fake_server.api_base, "--env-file", str(tmp_path / "none.env")]) == 0
    assert dry_default.is_file() and not committed.exists()


def test_dry_run_flag_is_a_harmless_alias(
    tmp_path: Path, fake_server: FakeMp3Quran, real_mp3: bytes, capsys: pytest.CaptureFixture[str]
) -> None:
    fake_server.files[ONE] = real_mp3
    assert main(base_args(tmp_path, fake_server, "--dry-run")) == 0
    assert capsys.readouterr().out.splitlines()[0] == "MODE: dry run (no uploads)"


def test_upload_and_dry_run_together_are_refused(tmp_path: Path, fake_server: FakeMp3Quran) -> None:
    with pytest.raises(SystemExit) as info:
        main(base_args(tmp_path, fake_server, "--upload", "--dry-run"))
    assert info.value.code == 2


def test_via_without_upload_is_refused(
    tmp_path: Path, fake_server: FakeMp3Quran, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main(base_args(tmp_path, fake_server, "--via", "worker")) == 1
    assert "--via only applies with --upload" in capsys.readouterr().err
    assert not (tmp_path / "m.json").exists()


def test_upload_via_worker_copies_and_checks_with_head(
    tmp_path: Path, fake_server: FakeMp3Quran, real_mp3: bytes, fake_worker: FakeWorker, mocked_r2: Any,
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
) -> None:
    set_full_credentials(monkeypatch, fake_worker)
    fake_server.files[ONE] = real_mp3
    fake_worker.on_copy = lambda key, size: mocked_r2.put_object(Bucket=BUCKET, Key=key, Body=b"\0" * size)
    local = tmp_path / "local"
    local.mkdir()
    (local / "059.mp3").write_bytes(real_mp3)

    code = main(base_args(tmp_path, fake_server, "--upload", "--source-dir", str(local)))
    captured = capsys.readouterr()
    assert code == 0
    assert captured.out.splitlines()[0] == f"MODE: UPLOAD via worker to bucket {BUCKET}"
    assert len(fake_worker.requests) == 1
    sent = fake_worker.requests[0]
    assert sent["auth"] == f"Bearer {WORKER_TOKEN}"
    assert sent["length"] < 1000 and set(json.loads(sent["body"])) == {"source_url", "key", "bytes", "sha256"}
    key = json.loads(sent["body"])["key"]
    assert mocked_r2.head_object(Bucket=BUCKET, Key=key)["ContentLength"] == len(real_mp3)
    for text in (captured.out, captured.err, (tmp_path / "m.json").read_text(encoding="utf-8")):
        assert WORKER_TOKEN not in text and SECRET not in text


def test_upload_via_s3_keeps_the_direct_upload(
    tmp_path: Path, fake_server: FakeMp3Quran, real_mp3: bytes, fake_worker: FakeWorker, mocked_r2: Any,
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
) -> None:
    set_full_credentials(monkeypatch, fake_worker)
    fake_server.files[ONE] = real_mp3
    code = main(base_args(tmp_path, fake_server, "--upload", "--via", "s3"))
    assert code == 0
    assert capsys.readouterr().out.splitlines()[0] == f"MODE: UPLOAD via s3 to bucket {BUCKET}"
    assert fake_worker.requests == [], "s3 mode never calls the Worker"
    key = json.loads((tmp_path / "m.json").read_text(encoding="utf-8"))["moshafs"][0]["files"][0]["key"]
    assert mocked_r2.head_object(Bucket=BUCKET, Key=key)["ContentLength"] == len(real_mp3)


def test_upload_without_worker_settings_names_the_variables(
    tmp_path: Path, fake_server: FakeMp3Quran, fake_worker: FakeWorker, mocked_r2: Any,
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv("R2_ACCOUNT_ID", ACCOUNT)
    monkeypatch.setenv("R2_ACCESS_KEY_ID", AKID)
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", SECRET)
    assert main(base_args(tmp_path, fake_server, "--upload")) == 1
    err = capsys.readouterr().err
    assert "R2_COPY_WORKER_URL" in err and "R2_COPY_TOKEN" in err
    assert SECRET not in err and ACCOUNT not in err
    assert fake_worker.requests == []


def test_upload_without_s3_credentials_names_the_variables(
    tmp_path: Path, fake_server: FakeMp3Quran, fake_worker: FakeWorker, monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv("R2_COPY_WORKER_URL", fake_worker.url)
    monkeypatch.setenv("R2_COPY_TOKEN", WORKER_TOKEN)
    assert main(base_args(tmp_path, fake_server, "--upload")) == 1
    err = capsys.readouterr().err
    assert "R2_ACCOUNT_ID" in err and "R2_SECRET_ACCESS_KEY" in err
    assert WORKER_TOKEN not in err
    assert fake_worker.requests == []


def test_worker_401_fails_the_cli_without_leaking_the_token(
    tmp_path: Path, fake_server: FakeMp3Quran, real_mp3: bytes, fake_worker: FakeWorker, mocked_r2: Any,
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str],
) -> None:
    set_full_credentials(monkeypatch, fake_worker)
    fake_server.files[ONE] = real_mp3
    fake_worker.script = [("status", 401, {"error": "unauthorised"})]
    assert main(base_args(tmp_path, fake_server, "--upload")) == 1
    captured = capsys.readouterr()
    assert "401" in captured.err and "unauthorised" in captured.err
    assert WORKER_TOKEN not in captured.out + captured.err
    assert not (tmp_path / "m.json").exists()


def test_worker_502_is_retried_by_the_cli(
    tmp_path: Path, fake_server: FakeMp3Quran, real_mp3: bytes, fake_worker: FakeWorker, mocked_r2: Any,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    set_full_credentials(monkeypatch, fake_worker)
    monkeypatch.setattr(worker_module, "BACKOFF_SECONDS", (0.0, 0.0, 0.0))
    fake_server.files[ONE] = real_mp3
    fake_worker.script = [("status", 502, {"error": "source responded with status 502"})]
    fake_worker.on_copy = lambda key, size: mocked_r2.put_object(Bucket=BUCKET, Key=key, Body=b"\0" * size)
    assert main(base_args(tmp_path, fake_server, "--upload")) == 0
    assert len(fake_worker.requests) == 2

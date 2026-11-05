"""Settings, keys, manifest helpers and the command line."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from mp3quran_ingest.cli import main
from mp3quran_ingest.config import R2Settings, load_r2_settings, parse_dotenv
from mp3quran_ingest.errors import CredentialsError
from mp3quran_ingest.keys import CACHE_CONTROL, CONTENT_TYPE, object_key, public_url
from mp3quran_ingest.manifest import finalize, upsert_file

from .conftest import SECRET
from .fake_mp3quran import FakeMp3Quran

SHA = "ab" * 32
PUBLIC = "https://audio.taybah-app.com"
ONE = "/audio/test-one/059.mp3"
TOOL_ENV = Path(__file__).resolve().parents[1] / ".env.example"


def test_object_key_layout() -> None:
    assert object_key(253, 59, SHA) == f"audio/mp3quran/253/059-{'ab' * 8}.mp3"
    assert CACHE_CONTROL == "public, max-age=31536000, immutable"
    assert CONTENT_TYPE == "audio/mpeg"


def test_object_key_rejects_bad_input() -> None:
    with pytest.raises(ValueError):
        object_key(253, 0, SHA)
    with pytest.raises(ValueError):
        object_key(253, 115, SHA)
    with pytest.raises(ValueError):
        object_key(253, 1, "xyz")


def test_public_url_joins_once() -> None:
    assert public_url("https://audio.taybah-app.com/", "a/b.mp3") == "https://audio.taybah-app.com/a/b.mp3"


def test_parse_dotenv_handles_comments_export_and_quotes() -> None:
    text = "# comment\n\nexport R2_BUCKET='quran'\nR2_ACCOUNT_ID=\"acct\"\nNOEQUALS\nR2_PUBLIC_BASE=https://x.example\n"
    assert parse_dotenv(text) == {"R2_BUCKET": "quran", "R2_ACCOUNT_ID": "acct", "R2_PUBLIC_BASE": "https://x.example"}


def test_environment_wins_over_env_file(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(f"R2_ACCOUNT_ID=from-file\nR2_ACCESS_KEY_ID=ak\nR2_SECRET_ACCESS_KEY={SECRET}\n", encoding="utf-8")
    settings = load_r2_settings(environ={"R2_ACCOUNT_ID": "from-env"}, env_file=env_file)
    assert settings.account_id == "from-env"
    assert settings.access_key_id == "ak"
    assert settings.bucket == "quran"
    assert settings.public_base == "https://audio.taybah-app.com"
    assert settings.endpoint_url == "https://from-env.r2.cloudflarestorage.com"


def test_missing_credentials_name_variables_not_values(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(f"R2_SECRET_ACCESS_KEY={SECRET}\n", encoding="utf-8")
    with pytest.raises(CredentialsError) as info:
        load_r2_settings(environ={}, env_file=env_file)
    message = str(info.value)
    assert "R2_ACCOUNT_ID" in message and "R2_ACCESS_KEY_ID" in message
    assert SECRET not in message


def test_dry_run_settings_do_not_require_credentials(tmp_path: Path) -> None:
    settings = load_r2_settings(environ={}, env_file=tmp_path / "absent.env", require_credentials=False)
    assert settings.bucket == "quran"


def test_repr_hides_credentials() -> None:
    settings = R2Settings(account_id="acct", access_key_id="AKID", secret_access_key=SECRET)
    assert SECRET not in repr(settings) and "AKID" not in repr(settings)


def test_env_example_has_names_only() -> None:
    lines = [line for line in TOOL_ENV.read_text(encoding="utf-8").splitlines() if line and not line.startswith("#")]
    assert {line.split("=", 1)[0] for line in lines} == {
        "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE",
        "R2_COPY_WORKER_URL", "R2_COPY_TOKEN",
    }
    assert all(line.split("=", 1)[1] in {"", "quran", "https://audio.taybah-app.com"} for line in lines)


def test_finalize_sorts_moshafs_and_files() -> None:
    manifest = {"schema": 1, "source": "mp3quran", "generated_at": None, "public_base": PUBLIC, "moshafs": []}

    def entry(surah: int) -> dict[str, object]:
        return {"surah": surah, "key": f"k{surah}", "url": "u", "bytes": 1, "sha256": SHA,
                "duration_ms": 1, "source_url": "s", "source_etag": None}

    for moshaf_id, surah in ((7, 59), (3, 1), (7, 1), (3, 59)):
        meta = {"moshaf_id": moshaf_id, "reciter_id": moshaf_id, "name_ar": "ا", "name_en": "a", "riwayah": "ح",
                "moshaf_name": "م", "server": "https://x/", "surah_list": [1, 59]}
        upsert_file(manifest, meta, entry(surah))
    finalize(manifest, "2026-11-04T12:00:00Z", PUBLIC)
    assert [m["moshaf_id"] for m in manifest["moshafs"]] == [3, 7]
    assert [f["surah"] for f in manifest["moshafs"][1]["files"]] == [1, 59]


def test_catalogue_command_snapshots_both_languages(tmp_path: Path, fake_server: FakeMp3Quran) -> None:
    out = tmp_path / "catalogue.json"
    assert main(["catalogue", "--out", str(out), "--api-base", fake_server.api_base]) == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["schema"] == 1 and data["source"] == "mp3quran" and data["fetched_at"]
    assert data["reciters"]["ar"][0]["name"] == "قارئ تجريبي للاختبار"
    assert data["reciters"]["eng"][0]["name"] == "Test Reciter"
    assert set(data["riwayat"]) == {"ar", "eng"}
    assert "ayat_timing_reads" in data
    assert "قارئ" in out.read_text(encoding="utf-8")


def test_cli_dry_run_needs_no_credentials(
    tmp_path: Path, fake_server: FakeMp3Quran, real_mp3: bytes, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    for name in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
        monkeypatch.delenv(name, raising=False)
    fake_server.files[ONE] = real_mp3
    manifest = tmp_path / "dry.json"
    code = main([
        "ingest", "--moshaf", "900", "--surah", "59", "--manifest", str(manifest),
        "--work-dir", str(tmp_path / "w"), "--api-base", fake_server.api_base, "--env-file", str(tmp_path / "none.env"),
    ])
    assert code == 0
    entry = json.loads(manifest.read_text(encoding="utf-8"))["moshafs"][0]["files"][0]
    assert entry["surah"] == 59 and 1480 <= entry["duration_ms"] <= 1520
    assert "dry run" in capsys.readouterr().out


def test_cli_dry_run_never_builds_an_s3_client(
    tmp_path: Path, fake_server: FakeMp3Quran, real_mp3: bytes, monkeypatch: pytest.MonkeyPatch
) -> None:
    import boto3

    def forbidden(*_args: Any, **_kwargs: Any) -> None:
        raise AssertionError("dry-run must not create an S3 client")

    monkeypatch.setattr(boto3, "client", forbidden)
    fake_server.files[ONE] = real_mp3
    assert main([
        "ingest", "--moshaf", "900", "--surah", "59", "--manifest", str(tmp_path / "d.json"),
        "--work-dir", str(tmp_path / "w"), "--api-base", fake_server.api_base, "--env-file", str(tmp_path / "none.env"),
    ]) == 0


def test_cli_dry_run_without_manifest_avoids_the_committed_path(
    tmp_path: Path, fake_server: FakeMp3Quran, real_mp3: bytes, monkeypatch: pytest.MonkeyPatch
) -> None:
    import mp3quran_ingest.cli as cli

    dry_default = tmp_path / "out" / "dry-manifest.json"
    committed = tmp_path / "committed" / "manifest.json"
    monkeypatch.setattr(cli, "DEFAULT_DRY_MANIFEST", dry_default)
    monkeypatch.setattr(cli, "DEFAULT_MANIFEST", committed)
    fake_server.files[ONE] = real_mp3
    assert main([
        "ingest", "--moshaf", "900", "--surah", "59", "--work-dir", str(tmp_path / "w"),
        "--api-base", fake_server.api_base, "--env-file", str(tmp_path / "none.env"),
    ]) == 0
    assert dry_default.is_file() and not committed.exists()


def test_cli_real_upload_without_credentials_fails_cleanly(
    tmp_path: Path, fake_server: FakeMp3Quran, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    for name in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
        monkeypatch.delenv(name, raising=False)
    code = main([
        "ingest", "--moshaf", "900", "--surah", "59", "--upload", "--manifest", str(tmp_path / "m.json"),
        "--api-base", fake_server.api_base, "--env-file", str(tmp_path / "none.env"),
    ])
    captured = capsys.readouterr()
    assert code == 1
    assert "R2_ACCOUNT_ID" in captured.err and "R2_SECRET_ACCESS_KEY" in captured.err
    assert not (tmp_path / "m.json").exists()

from __future__ import annotations

import shutil
import subprocess
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import boto3
import pytest
from botocore.config import Config
from moto import mock_aws

from mp3quran_ingest.api import Mp3QuranApi
from mp3quran_ingest.config import R2Settings
from mp3quran_ingest.store import R2Store

from .fake_mp3quran import FakeMp3Quran
from .fake_worker import FakeWorker

BUCKET = "quran"
SECRET = "SECRET-VALUE-DO-NOT-LEAK-9f3a7c"
ARABIC_RECITER = "قارئ تجريبي للاختبار"
HAFS = "حفص عن عاصم"
WORKER_TOKEN = "WORKER-TOKEN-DO-NOT-LEAK-72b1e0"
R2_NAMES = (
    "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE",
    "R2_COPY_WORKER_URL", "R2_COPY_TOKEN",
)


@pytest.fixture(autouse=True)
def no_real_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Fence off the developer's real `.env` and any R2 variables in the shell, for every test."""
    import mp3quran_ingest.cli as cli
    import mp3quran_ingest.config as config

    for name in R2_NAMES:
        monkeypatch.delenv(name, raising=False)
    absent = tmp_path / "no-such.env"
    monkeypatch.setattr(config, "DEFAULT_ENV_FILE", absent)
    monkeypatch.setattr(cli, "DEFAULT_ENV_FILE", absent)
    yield


@pytest.fixture
def fake_worker() -> Iterator[FakeWorker]:
    fake = FakeWorker(WORKER_TOKEN)
    fake.start()
    try:
        yield fake
    finally:
        fake.stop()


def fake_surah_bytes(label: str, size: int = 4096) -> bytes:
    """Placeholder bytes (not audio). Tests that need duration use a real mp3 fixture instead."""
    seed = f"FAKE-MP3|{label}|".encode("utf-8")
    return (seed * (size // len(seed) + 1))[:size]


@pytest.fixture
def fake_server() -> Iterator[FakeMp3Quran]:
    fake = FakeMp3Quran()
    fake.reciters = {
        "ar": [
            {
                "id": 900,
                "name": ARABIC_RECITER,
                "moshaf": [
                    {
                        "id": 900,
                        "name": f"{HAFS} - مرتل",
                        "rewaya_id": 1,
                        "server": fake.audio_folder("test-one"),
                        "surah_total": 3,
                        "moshaf_type": 11,
                        "surah_list": "59,1,3",
                    }
                ],
            },
            {
                "id": 901,
                "name": "قارئ آخر",
                "moshaf": [
                    {
                        "id": 901,
                        "name": "ورش عن نافع",
                        "rewaya_id": 2,
                        "server": fake.audio_folder("test-two"),
                        "surah_total": 1,
                        "moshaf_type": 11,
                        "surah_list": "1",
                    }
                ],
            },
        ],
        "eng": [
            {
                "id": 900,
                "name": "Test Reciter",
                "moshaf": [{"id": 900, "name": "Hafs an Asim", "rewaya_id": 1, "server": fake.audio_folder("test-one"),
                            "surah_total": 3, "moshaf_type": 11, "surah_list": "59,1,3"}],
            },
            {"id": 901, "name": "Other Reciter", "moshaf": []},
        ],
    }
    fake.riwayat = {
        "ar": [{"id": 1, "name": HAFS}, {"id": 2, "name": "ورش عن نافع"}],
        "eng": [{"id": 1, "name": "Hafs"}, {"id": 2, "name": "Warsh"}],
    }
    fake.files = {
        "/audio/test-one/059.mp3": fake_surah_bytes("059"),
        "/audio/test-one/001.mp3": fake_surah_bytes("001"),
        "/audio/test-one/003.mp3": fake_surah_bytes("003", 3000),
        "/audio/test-two/001.mp3": fake_surah_bytes("w001"),
    }
    fake.start()
    try:
        yield fake
    finally:
        fake.stop()


@pytest.fixture
def api(fake_server: FakeMp3Quran) -> Mp3QuranApi:
    return Mp3QuranApi(fake_server.api_base, timeout=10)


@pytest.fixture
def settings() -> R2Settings:
    return R2Settings(account_id="acct123", access_key_id="AKIDTEST", secret_access_key=SECRET,
                      bucket=BUCKET, public_base="https://audio.taybah-app.com")


@pytest.fixture
def s3_client() -> Iterator[Any]:
    with mock_aws():
        client = boto3.client(
            "s3",
            region_name="us-east-1",
            aws_access_key_id="AKIDTEST",
            aws_secret_access_key=SECRET,
            config=Config(request_checksum_calculation="when_required",
                          response_checksum_validation="when_required"),
        )
        client.create_bucket(Bucket=BUCKET)
        yield client


@pytest.fixture
def store(settings: R2Settings, s3_client: Any) -> R2Store:
    return R2Store(settings, client=s3_client)


@pytest.fixture
def ffmpeg_path() -> str:
    path = shutil.which("ffmpeg") or shutil.which("ffmpeg", path="/opt/homebrew/bin")
    if path is None:
        pytest.skip("ffmpeg not installed")
    return path


@pytest.fixture(scope="session")
def real_mp3(tmp_path_factory: pytest.TempPathFactory) -> bytes:
    """A 1.5 s real mp3 made by ffmpeg, for the duration test."""
    exe = shutil.which("ffmpeg") or shutil.which("ffmpeg", path="/opt/homebrew/bin")
    if exe is None:
        pytest.skip("ffmpeg not installed")
    out = tmp_path_factory.mktemp("mp3") / "tone.mp3"
    subprocess.run(
        [exe, "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1.5",
         "-codec:a", "libmp3lame", "-b:a", "64k", str(out)],
        check=True,
    )
    return out.read_bytes()

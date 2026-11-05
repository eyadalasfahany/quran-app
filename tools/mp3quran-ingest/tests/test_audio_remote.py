"""Duration and sha256 on real files, and resumable transfer."""

from __future__ import annotations

import hashlib
from pathlib import Path

import pytest

from mp3quran_ingest.audio import measure_duration_ms, sha256_file
from mp3quran_ingest.errors import AudioError, DownloadError
from mp3quran_ingest.remote import download_file, head_file

from .fake_mp3quran import FakeMp3Quran


def test_measured_duration_of_real_mp3(tmp_path: Path, real_mp3: bytes, ffmpeg_path: str) -> None:
    path = tmp_path / "tone.mp3"
    path.write_bytes(real_mp3)
    duration = measure_duration_ms(path, ffmpeg=ffmpeg_path)
    assert 1400 <= duration <= 1600, duration


def test_undecodable_file_is_refused(tmp_path: Path, ffmpeg_path: str) -> None:
    path = tmp_path / "bad.mp3"
    path.write_bytes(b"not audio at all" * 200)
    with pytest.raises(AudioError):
        measure_duration_ms(path, ffmpeg=ffmpeg_path)


def test_missing_ffmpeg_is_reported(tmp_path: Path) -> None:
    path = tmp_path / "x.mp3"
    path.write_bytes(b"x")
    with pytest.raises(AudioError, match="not found on PATH"):
        measure_duration_ms(path, ffmpeg="no-such-ffmpeg-binary-xyz")


def test_sha256_matches_hashlib(tmp_path: Path) -> None:
    path = tmp_path / "f.bin"
    payload = b"abc" * 500_000
    path.write_bytes(payload)
    assert sha256_file(path) == hashlib.sha256(payload).hexdigest()


def test_head_reports_length_and_etag(fake_server: FakeMp3Quran) -> None:
    url = f"{fake_server.host}/audio/test-one/001.mp3"
    info = head_file(url)
    assert info.content_length == len(fake_server.files["/audio/test-one/001.mp3"])
    assert info.etag and info.etag.startswith('"')


def test_head_missing_file_is_an_error(fake_server: FakeMp3Quran) -> None:
    with pytest.raises(DownloadError):
        head_file(f"{fake_server.host}/audio/none/001.mp3")


def test_download_resumes_from_part_with_range(tmp_path: Path, fake_server: FakeMp3Quran) -> None:
    served = fake_server.files["/audio/test-one/003.mp3"]
    url = f"{fake_server.host}/audio/test-one/003.mp3"
    final = tmp_path / "003.mp3"
    (tmp_path / "003.mp3.part").write_bytes(served[:1000])
    download_file(url, final, len(served))
    assert final.read_bytes() == served
    assert not (tmp_path / "003.mp3.part").exists()
    assert ("GET", "/audio/test-one/003.mp3", "bytes=1000-") in fake_server.requests


def test_oversized_part_is_discarded_and_refetched(tmp_path: Path, fake_server: FakeMp3Quran) -> None:
    served = fake_server.files["/audio/test-one/003.mp3"]
    final = tmp_path / "003.mp3"
    (tmp_path / "003.mp3.part").write_bytes(b"z" * (len(served) + 10))
    download_file(f"{fake_server.host}/audio/test-one/003.mp3", final, len(served))
    assert final.read_bytes() == served

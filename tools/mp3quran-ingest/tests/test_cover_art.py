"""Files with an embedded cover image (Way2Quran, ADR 0074): duration from the audio stream only; bytes unchanged.

Skipped when ffmpeg or ffprobe is not installed.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

import pytest

from mp3quran_ingest import audio
from mp3quran_ingest.audio import measure_duration_ms, sha256_file


@pytest.fixture
def ffprobe_path(ffmpeg_path: str) -> str:
    sibling = Path(ffmpeg_path).with_name("ffprobe")
    path = str(sibling) if sibling.is_file() else shutil.which("ffprobe")
    if path is None:
        pytest.skip("ffprobe not installed")
    return path


@pytest.fixture
def cover_mp3(ffmpeg_path: str, tmp_path: Path) -> bytes:
    """A 1.5 s tone with a 16x16 PNG attached as cover art, built with ffmpeg."""
    work = tmp_path / "cover"
    work.mkdir()
    tone = work / "tone.mp3"
    cover = work / "cover.png"
    out = work / "with-cover.mp3"
    run = [ffmpeg_path, "-v", "error", "-y"]
    subprocess.run(
        [*run, "-f", "lavfi", "-i", "sine=frequency=440:duration=1.5",
         "-codec:a", "libmp3lame", "-b:a", "64k", str(tone)],
        check=True,
    )
    subprocess.run([*run, "-f", "lavfi", "-i", "color=c=blue:s=16x16", "-frames:v", "1", str(cover)], check=True)
    subprocess.run(
        [*run, "-i", str(tone), "-i", str(cover), "-map", "0:a", "-map", "1:v", "-c", "copy",
         "-id3v2_version", "3", "-disposition:v", "attached_pic", str(out)],
        check=True,
    )
    return out.read_bytes()


def streams(ffprobe: str, path: Path) -> list[dict[str, Any]]:
    result = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "stream=codec_type:stream_disposition=attached_pic", "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    return list(json.loads(result.stdout)["streams"])


def test_fixture_really_has_an_attached_cover_stream(tmp_path: Path, cover_mp3: bytes, ffprobe_path: str) -> None:
    path = tmp_path / "with-cover.mp3"
    path.write_bytes(cover_mp3)
    found = streams(ffprobe_path, path)
    audio_streams = [s for s in found if s["codec_type"] == "audio"]
    cover_streams = [s for s in found if s["codec_type"] == "video"]
    assert len(audio_streams) == 1
    assert len(cover_streams) == 1 and cover_streams[0]["disposition"]["attached_pic"] == 1


def test_duration_comes_from_the_audio_stream(tmp_path: Path, cover_mp3: bytes, ffmpeg_path: str) -> None:
    path = tmp_path / "with-cover.mp3"
    path.write_bytes(cover_mp3)
    duration = measure_duration_ms(path, ffmpeg=ffmpeg_path)
    assert 1400 <= duration <= 1600, duration


def test_duration_measure_maps_the_first_audio_stream_only(
    tmp_path: Path, cover_mp3: bytes, ffmpeg_path: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = tmp_path / "with-cover.mp3"
    path.write_bytes(cover_mp3)
    commands: list[list[str]] = []
    real_run = subprocess.run

    def recording_run(command: list[str], *args: Any, **kwargs: Any) -> Any:
        commands.append(list(command))
        return real_run(command, *args, **kwargs)

    monkeypatch.setattr(audio.subprocess, "run", recording_run)
    measure_duration_ms(path, ffmpeg=ffmpeg_path)
    assert len(commands) == 1
    command = commands[0]
    assert command[command.index("-map") + 1] == "0:a:0"
    assert "-map" in command and command.count("-map") == 1


def test_bytes_and_sha256_are_the_file_as_it_is(tmp_path: Path, cover_mp3: bytes, ffmpeg_path: str) -> None:
    path = tmp_path / "with-cover.mp3"
    path.write_bytes(cover_mp3)
    measure_duration_ms(path, ffmpeg=ffmpeg_path)
    assert path.read_bytes() == cover_mp3, "measuring never alters the file"
    assert sha256_file(path) == hashlib.sha256(cover_mp3).hexdigest()
    assert path.stat().st_size == len(cover_mp3)

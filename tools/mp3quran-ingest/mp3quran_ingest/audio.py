"""Local file facts: sha256 and the decoded duration (measured with ffmpeg, which must be on PATH)."""

from __future__ import annotations

import hashlib
import shutil
import subprocess
from pathlib import Path

from .errors import AudioError

CHUNK = 1 << 20


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(CHUNK):
            digest.update(chunk)
    return digest.hexdigest()


def measure_duration_ms(path: Path, ffmpeg: str = "ffmpeg") -> int:
    """Decode the whole first audio stream and return the decoded end time in ms.

    ffmpeg writes `-progress` lines; the last `out_time_us` is the decoded position after the
    full decode (`-f null` discards the samples). Header-only estimates are not used.
    On Apple silicon Homebrew installs ffmpeg in /opt/homebrew/bin.
    """
    executable = shutil.which(ffmpeg)
    if executable is None:
        raise AudioError(f"{ffmpeg} not found on PATH (Homebrew: /opt/homebrew/bin)")
    command = [
        executable,
        "-v", "error",
        "-nostats",
        "-progress", "pipe:1",
        "-i", str(path),
        "-map", "0:a:0",
        "-f", "null",
        "-",
    ]
    result = subprocess.run(command, capture_output=True, text=True, errors="replace", check=False)  # non-UTF-8 tags
    if result.returncode != 0:
        detail = result.stderr.strip()[:300]
        raise AudioError(f"ffmpeg could not decode {path.name}: {detail}")
    last_us: int | None = None
    for line in result.stdout.splitlines():
        key, _, value = line.partition("=")
        if key == "out_time_us" and value.strip().isdigit():
            last_us = int(value.strip())
    if last_us is None:
        raise AudioError(f"ffmpeg reported no decoded time for {path.name}")
    return round(last_us / 1000)

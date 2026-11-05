"""Pauses in the audio (ffmpeg silencedetect), shared by the snap pass and scripts/pause_check.py.

A pause is the interval [silence_start, silence_end] in seconds. A pause that runs to the end of the
file has no silence_end line and is reported with end = inf.
"""

import json
import re
import subprocess
from pathlib import Path

SILENCE_START = re.compile(r"silence_start:\s*(-?[0-9.]+)")
SILENCE_END = re.compile(r"silence_end:\s*(-?[0-9.]+)")
DEFAULT_NOISE_DB = -22.0
DEFAULT_MIN_SILENCE_S = 0.25  # snapping uses 0.25 s; pause_check's ADR 0052 metric uses 0.4 s


def parse_silencedetect(stderr: str) -> list[tuple[float, float]]:
    """Pairs of (start, end) from silencedetect's stderr output."""
    starts = [float(m.group(1)) for m in SILENCE_START.finditer(stderr)]
    ends = [float(m.group(1)) for m in SILENCE_END.finditer(stderr)]
    if len(starts) == len(ends) + 1:
        ends.append(float("inf"))
    if len(starts) != len(ends):
        raise ValueError("silencedetect output has unmatched start and end lines")
    return list(zip(starts, ends))


def detect_pauses(audio: Path, noise_db: float = DEFAULT_NOISE_DB,
                  min_silence_s: float = DEFAULT_MIN_SILENCE_S) -> list[tuple[float, float]]:
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", str(audio),
           "-af", f"silencedetect=noise={noise_db}dB:d={min_silence_s}", "-f", "null", "-"]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed on {audio}: {proc.stderr[-500:]}")
    return parse_silencedetect(proc.stderr)


def cached_pauses(audio: Path, audio_sha256: str, cache: Path | None,
                  noise_db: float = DEFAULT_NOISE_DB,
                  min_silence_s: float = DEFAULT_MIN_SILENCE_S) -> list[tuple[float, float]]:
    """detect_pauses, saved to `cache` (JSON) and reused when the audio and settings match."""
    key = f"{audio_sha256}|{noise_db}|{min_silence_s}"
    if cache is not None and cache.is_file():
        data = json.loads(cache.read_text(encoding="utf-8"))
        if data.get("key") == key:
            return [(float(s), float(e)) for s, e in data["pauses"]]
    pauses = detect_pauses(audio, noise_db, min_silence_s)
    if cache is not None:
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps({"key": key, "pauses": pauses}), encoding="utf-8")
    return pauses

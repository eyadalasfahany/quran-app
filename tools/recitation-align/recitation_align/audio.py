"""Audio input: 16 kHz mono float32 samples, plus a SHA-256 of the source file."""

import hashlib
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

from .models import SAMPLE_RATE


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def _is_wav16k_mono(path: Path) -> bool:
    try:
        with wave.open(str(path)) as w:
            return (
                w.getframerate() == SAMPLE_RATE
                and w.getnchannels() == 1
                and w.getsampwidth() == 2
            )
    except wave.Error:
        return False


def _read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path)) as w:
        raw = w.readframes(w.getnframes())
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def load_wav16k(path: Path) -> np.ndarray:
    """Return mono float32 samples at 16 kHz. Other inputs (mp3, stereo, other rates) go through ffmpeg.

    ffmpeg decodes the first audio stream only: a cover image embedded as a video stream (Way2Quran
    files carry a PNG) is not read as audio.
    """
    path = Path(path)
    if _is_wav16k_mono(path):
        return _read_wav(path)
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "converted.wav"
        cmd = [
            "ffmpeg", "-nostdin", "-loglevel", "error", "-y",
            "-i", str(path), "-map", "0:a:0", "-vn", "-ac", "1", "-ar", str(SAMPLE_RATE),
            "-c:a", "pcm_s16le", str(out),
        ]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True)
        except FileNotFoundError as exc:
            raise RuntimeError("ffmpeg is needed to read this file and was not found on PATH") from exc
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg failed on {path.name}: {proc.stderr.strip()}")
        return _read_wav(out)

"""Step 1 of the prototype path: speech-to-text with a Quran-tuned Whisper, CPU, 30 s windows."""

from functools import lru_cache

import numpy as np
import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor

from .models import ASR_MODEL, ASR_REVISION, DEVICE, SAMPLE_RATE, TORCH_THREADS

CHUNK_SECONDS = 30
MAX_NEW_TOKENS = 220


@lru_cache(maxsize=1)
def _load():
    torch.set_num_threads(TORCH_THREADS)
    proc = WhisperProcessor.from_pretrained(ASR_MODEL, revision=ASR_REVISION)
    model = WhisperForConditionalGeneration.from_pretrained(
        ASR_MODEL, revision=ASR_REVISION, use_safetensors=False
    ).eval()
    return proc, model.to(DEVICE)


def transcribe(wav: np.ndarray) -> dict:
    """Return {"text": str, "chunks": [{"start_s": float, "text": str}, ...]}."""
    proc, model = _load()
    size = CHUNK_SECONDS * SAMPLE_RATE
    chunks = []
    for i in range(0, len(wav), size):
        feats = proc(wav[i:i + size], sampling_rate=SAMPLE_RATE, return_tensors="pt").input_features
        with torch.inference_mode():
            ids = model.generate(feats.to(DEVICE), max_new_tokens=MAX_NEW_TOKENS)
        text = proc.batch_decode(ids, skip_special_tokens=True)[0].strip()
        chunks.append({"start_s": i / SAMPLE_RATE, "text": text})
        print(f"[{i / SAMPLE_RATE:6.0f}s] {text[:70]}", flush=True)
    return {"text": " ".join(c["text"] for c in chunks), "chunks": chunks}


def transcription_key(audio_sha256: str) -> str:
    """Cache key: audio, ASR model revision, and the chunking that shapes the output."""
    return f"{audio_sha256}|{ASR_MODEL}@{ASR_REVISION}|{CHUNK_SECONDS}|{MAX_NEW_TOKENS}"


def cached_transcribe(wav: np.ndarray, audio_sha256: str, cache) -> dict:
    """transcribe(), saved as JSON at `cache` and reused when the key matches. `cache` may be None."""
    import json
    from pathlib import Path

    key = transcription_key(audio_sha256)
    if cache is not None and Path(cache).is_file():
        data = json.loads(Path(cache).read_text(encoding="utf-8"))
        if data.get("key") == key:
            return data["asr"]
    asr = transcribe(wav)
    if cache is not None:
        Path(cache).parent.mkdir(parents=True, exist_ok=True)
        Path(cache).write_text(json.dumps({"key": key, "asr": asr}, ensure_ascii=False), encoding="utf-8")
    return asr


# Quality mode (ADR 0077, plan Q1): shared 30 s windows at arbitrary positions. Additions only; the
# functions above are unchanged (B2).
WINDOW_SECONDS = 30


def _window_key(start_s: float, end_s: float) -> str:
    return f"{round(start_s * 1000)}-{round(end_s * 1000)}"


def transcribe_at(wav: np.ndarray, windows: list[tuple[float, float]]) -> dict:
    """Transcribe the [start_s, end_s) windows of `wav`, in the order given.

    Returns {"windows": [{"start_s", "end_s", "text"}, ...]}. The model call and the decode are the same
    as transcribe()'s loop body; the loop is copied, not shared, so transcribe() stays byte-identical.
    """
    if not windows:
        return {"windows": []}
    proc, model = _load()
    out = []
    for start_s, end_s in windows:
        a = round(start_s * SAMPLE_RATE)
        b = round(end_s * SAMPLE_RATE)
        feats = proc(wav[a:b], sampling_rate=SAMPLE_RATE, return_tensors="pt").input_features
        with torch.inference_mode():
            ids = model.generate(feats.to(DEVICE), max_new_tokens=MAX_NEW_TOKENS)
        text = proc.batch_decode(ids, skip_special_tokens=True)[0].strip()
        out.append({"start_s": start_s, "end_s": end_s, "text": text})
    return {"windows": out}


def transcription_key_at(audio_sha256: str) -> str:
    """Cache key for shared windows: the transcription key plus the window grid marker."""
    return transcription_key(audio_sha256) + f"|win={WINDOW_SECONDS}|at"


def cached_transcribe_at(wav: np.ndarray, audio_sha256: str, cache_path, windows) -> dict:
    """Windows of `wav`, reusing the ASR cache at `cache_path` (format: ASR cache, plan way2quran-quality).

    Only windows missing from a cache whose key matches are transcribed. A key mismatch recomputes every
    window. The file is written atomically (temp file, then rename). `cache_path` may be None.
    Returns {"windows": [...]} for the requested windows, in the requested order.
    """
    import json
    import os
    import time
    from pathlib import Path

    key = transcription_key_at(audio_sha256)
    texts: dict[str, str] = {}
    extra: dict = {}
    if cache_path is not None and Path(cache_path).is_file():
        data = json.loads(Path(cache_path).read_text(encoding="utf-8"))
        if data.get("key") == key:
            texts = dict(data.get("windows", {}))
            extra = {k: v for k, v in data.items() if k not in ("key", "windows")}

    missing = []
    for start_s, end_s in windows:
        k = _window_key(start_s, end_s)
        if k not in texts and (start_s, end_s) not in missing:
            missing.append((start_s, end_s))

    seconds = float(extra.get("seconds", 0.0))
    if missing:
        t0 = time.perf_counter()
        fresh = transcribe_at(wav, missing)["windows"]
        seconds += time.perf_counter() - t0
        for w in fresh:
            texts[_window_key(w["start_s"], w["end_s"])] = w["text"]
        if cache_path is not None:
            path = Path(cache_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            body = {**extra, "key": key, "windows": texts, "seconds": round(seconds, 1)}
            tmp = path.with_name(path.name + ".tmp")
            tmp.write_text(json.dumps(body, ensure_ascii=False), encoding="utf-8")
            os.replace(tmp, path)

    return {"windows": [
        {"start_s": s, "end_s": e, "text": texts[_window_key(s, e)]} for s, e in windows
    ]}

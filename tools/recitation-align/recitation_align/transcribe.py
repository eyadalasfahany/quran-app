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

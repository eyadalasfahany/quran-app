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

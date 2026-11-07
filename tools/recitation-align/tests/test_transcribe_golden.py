"""B2: `transcribe()` with a fake model. Chunking, printed lines, call arguments and `transcription_key()`
equal a committed golden (plan step Q0). Placeholder text only; no model, no network.
`UPDATE_GOLDEN=1` rewrites the golden file; a normal run only compares.
"""

import json
import os
from pathlib import Path

import numpy as np
import torch

from recitation_align import transcribe as T

GOLDEN = Path(__file__).parent / "golden" / "transcribe" / "transcribe.json"
SHA = "0" * 64


class FakeFeatures:
    def __init__(self, n_samples):
        self.input_features = torch.full((1, 3, 2), float(n_samples))


class FakeProcessor:
    def __init__(self, log):
        self.log = log

    def __call__(self, audio, sampling_rate, return_tensors):
        self.log.append({"proc": {"samples": len(audio), "sampling_rate": sampling_rate,
                                  "return_tensors": return_tensors}})
        return FakeFeatures(len(audio))

    def batch_decode(self, ids, skip_special_tokens):
        self.log.append({"decode": {"ids": ids.tolist(), "skip_special_tokens": skip_special_tokens}})
        return [f"  FIXTURE chunk {int(ids[0, 0])} - not Quran  "]


class FakeModel:
    def __init__(self, log):
        self.log = log
        self.n = 0

    def generate(self, feats, max_new_tokens):
        self.log.append({"generate": {"shape": list(feats.shape), "max_new_tokens": max_new_tokens}})
        self.n += 1
        return torch.tensor([[self.n, 0]])


def produce(monkeypatch, capsys):
    log = []
    monkeypatch.setattr(T, "_load", lambda: (FakeProcessor(log), FakeModel(log)))
    wav = np.zeros(75 * T.SAMPLE_RATE + 123, dtype=np.float32)
    result = T.transcribe(wav)
    return {"result": result, "stdout": capsys.readouterr().out, "calls": log,
            "key": T.transcription_key(SHA)}


def test_transcribe_matches_the_golden(monkeypatch, capsys):
    produced = produce(monkeypatch, capsys)
    text = json.dumps(produced, indent=2, ensure_ascii=False) + "\n"
    if os.environ.get("UPDATE_GOLDEN") == "1":
        GOLDEN.parent.mkdir(parents=True, exist_ok=True)
        GOLDEN.write_text(text, encoding="utf-8")
    assert GOLDEN.read_text(encoding="utf-8") == text


def test_golden_shape_is_three_thirty_second_windows(monkeypatch, capsys):
    produced = produce(monkeypatch, capsys)
    assert [c["start_s"] for c in produced["result"]["chunks"]] == [0.0, 30.0, 60.0]
    assert produced["key"].endswith(f"|{T.CHUNK_SECONDS}|{T.MAX_NEW_TOKENS}")

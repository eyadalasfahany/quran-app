"""Shared ASR windows (plan way2quran-quality Q1): `transcribe_at`, `transcription_key_at` and the cache.
Fake model and processor, placeholder text only; no model, no network.
"""

import json

import numpy as np
import torch

from recitation_align import transcribe as T

SHA = "0" * 64


class FakeFeatures:
    def __init__(self, n_samples):
        self.input_features = torch.full((1, 3, 2), float(n_samples))


class FakeProcessor:
    def __init__(self, log):
        self.log = log

    def __call__(self, audio, sampling_rate, return_tensors):
        self.log.append(("proc", len(audio)))
        return FakeFeatures(len(audio))

    def batch_decode(self, ids, skip_special_tokens):
        return [f"  FIXTURE window {int(ids[0, 0])} - not Quran  "]


class FakeModel:
    """Each window's text depends only on its sample count, so the same window always gets the same text."""

    def __init__(self, log):
        self.log = log

    def generate(self, feats, max_new_tokens):
        self.log.append(("generate", max_new_tokens))
        return torch.tensor([[int(feats[0, 0, 0])]])


def install(monkeypatch):
    log: list = []
    monkeypatch.setattr(T, "_load", lambda: (FakeProcessor(log), FakeModel(log)))
    return log


def grid_windows(duration_s: float):
    out = []
    start = 0.0
    while start < duration_s:
        out.append((start, min(start + T.WINDOW_SECONDS, duration_s)))
        start += T.WINDOW_SECONDS
    return out


def test_windows_on_the_thirty_second_grid_match_transcribe(monkeypatch):
    install(monkeypatch)
    wav = np.zeros(75 * T.SAMPLE_RATE + 123, dtype=np.float32)
    duration = len(wav) / T.SAMPLE_RATE
    grid = grid_windows(duration)
    assert len(grid) == 3

    shared = T.transcribe_at(wav, grid)["windows"]
    whole = T.transcribe(wav)["chunks"]
    assert [w["text"] for w in shared] == [c["text"] for c in whole]
    assert [w["start_s"] for w in shared] == [c["start_s"] for c in whole]


def test_transcribe_at_with_no_windows_loads_nothing(monkeypatch):
    def boom():
        raise AssertionError("no window means no model load")

    monkeypatch.setattr(T, "_load", boom)
    assert T.transcribe_at(np.zeros(16000, dtype=np.float32), []) == {"windows": []}


def test_key_differs_from_the_transcription_key():
    key = T.transcription_key_at(SHA)
    assert key != T.transcription_key(SHA)
    assert key == T.transcription_key(SHA) + "|win=30|at"


def test_only_missing_windows_are_computed(monkeypatch, tmp_path):
    log = install(monkeypatch)
    wav = np.zeros(90 * T.SAMPLE_RATE, dtype=np.float32)
    cache = tmp_path / "asr" / "016.json"
    windows = [(0.0, 30.0), (30.0, 60.0), (60.0, 90.0)]

    first = T.cached_transcribe_at(wav, SHA, cache, windows[:2])
    assert len(first["windows"]) == 2
    assert sum(1 for c in log if c[0] == "generate") == 2

    log.clear()
    second = T.cached_transcribe_at(wav, SHA, cache, windows)
    assert sum(1 for c in log if c[0] == "generate") == 1
    assert second["windows"][:2] == first["windows"]

    saved = json.loads(cache.read_text(encoding="utf-8"))
    assert saved["key"] == T.transcription_key_at(SHA)
    assert set(saved["windows"]) == {"0-30000", "30000-60000", "60000-90000"}


def test_fully_cached_run_computes_nothing(monkeypatch, tmp_path):
    log = install(monkeypatch)
    wav = np.zeros(60 * T.SAMPLE_RATE, dtype=np.float32)
    cache = tmp_path / "016.json"
    windows = [(0.0, 30.0), (30.0, 60.0)]
    T.cached_transcribe_at(wav, SHA, cache, windows)
    log.clear()
    again = T.cached_transcribe_at(wav, SHA, cache, windows)
    assert [c for c in log if c[0] == "generate"] == []
    assert len(again["windows"]) == 2


def test_mismatched_key_recomputes_every_window(monkeypatch, tmp_path):
    log = install(monkeypatch)
    wav = np.zeros(60 * T.SAMPLE_RATE, dtype=np.float32)
    cache = tmp_path / "016.json"
    cache.write_text(json.dumps({
        "key": "some-other-key",
        "windows": {"0-30000": "FIXTURE stale - not Quran"},
        "seconds": 1.0,
    }), encoding="utf-8")

    result = T.cached_transcribe_at(wav, SHA, cache, [(0.0, 30.0), (30.0, 60.0)])
    assert sum(1 for c in log if c[0] == "generate") == 2
    assert "stale" not in json.dumps(result, ensure_ascii=False)
    saved = json.loads(cache.read_text(encoding="utf-8"))
    assert saved["key"] == T.transcription_key_at(SHA)
    assert "seconds" in saved


def test_write_is_atomic_and_leaves_no_temp_file(monkeypatch, tmp_path):
    install(monkeypatch)
    wav = np.zeros(30 * T.SAMPLE_RATE, dtype=np.float32)
    cache = tmp_path / "nested" / "016.json"
    T.cached_transcribe_at(wav, SHA, cache, [(0.0, 30.0)])
    assert cache.is_file()
    assert [p.name for p in cache.parent.iterdir()] == ["016.json"]


def test_cache_none_computes_without_writing(monkeypatch, tmp_path):
    log = install(monkeypatch)
    wav = np.zeros(30 * T.SAMPLE_RATE, dtype=np.float32)
    result = T.cached_transcribe_at(wav, SHA, None, [(0.0, 30.0)])
    assert len(result["windows"]) == 1
    assert sum(1 for c in log if c[0] == "generate") == 1
    assert list(tmp_path.iterdir()) == []


def test_duplicate_windows_are_computed_once(monkeypatch):
    log = install(monkeypatch)
    wav = np.zeros(30 * T.SAMPLE_RATE, dtype=np.float32)
    result = T.cached_transcribe_at(wav, SHA, None, [(0.0, 30.0), (0.0, 30.0)])
    assert sum(1 for c in log if c[0] == "generate") == 1
    assert result["windows"][0] == result["windows"][1]

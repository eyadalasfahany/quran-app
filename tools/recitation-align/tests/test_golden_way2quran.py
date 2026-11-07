"""B3: an aligner-only Way2Quran fixture run is byte-identical, and no ASR is ever called (plan step Q0).

The fixture is the `way2quran` case under tests/golden/ (reciter id 9, surah 112; see make_golden.py). The run is
`pilot_published.main --source-kind way2quran --aligner-only`, then `export.main --kind way2quran` and
`ci.quality_summary`. Every `recitation_align.transcribe` entry point, including the ones later steps add
(`transcribe_at`, `transcribe_clips`), is replaced by a function that fails the test when called.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "golden"))

import golden_cases as gc  # noqa: E402

from recitation_align import transcribe  # noqa: E402

ASR_ENTRY_POINTS = ("transcribe", "cached_transcribe", "transcribe_at", "transcribe_clips", "_load")


def forbid_asr(monkeypatch):
    calls = []

    def forbidden(name):
        def fail(*_a, **_k):
            calls.append(name)
            raise AssertionError(f"{name} must not be called without the quality flag")
        return fail

    for name in ASR_ENTRY_POINTS:
        monkeypatch.setattr(transcribe, name, forbidden(name), raising=False)
    return calls


def test_aligner_only_run_is_byte_identical_and_never_calls_asr(tmp_path, monkeypatch, capsys):
    calls = forbid_asr(monkeypatch)
    out = gc.run_case("way2quran", tmp_path, monkeypatch, capsys)
    gc.compare_or_update("way2quran", out)
    assert calls == []


def test_the_run_is_aligner_sourced_and_way2quran_shaped():
    import json

    doc = json.loads((gc.GOLDEN / "way2quran" / "expected" / "aligned" / "112.json").read_text(encoding="utf-8"))
    assert doc["source"] == "aligner" and doc["published"] == {"none": "aligner-only source"}
    timing = json.loads((gc.GOLDEN / "way2quran" / "expected" / "timing" / "112.json").read_text(encoding="utf-8"))
    assert timing["kind"] == "way2quran" and timing["recitation_key"] == "9"

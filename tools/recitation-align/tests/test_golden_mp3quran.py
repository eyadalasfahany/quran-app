"""T2: golden MP3Quran runs, model-free (plan step Q0). Baselines: all pass on the unchanged code.

Three cases, each a committed fixture folder under tests/golden/ (see make_golden.py for how it was built):
- mp3quran-86-112: the published path (surah 112, moshaf 86's real audio and real published rows);
- fallback: published timings refused (a missing ayah), so `--fallback-aligner` aligns the surah (surah 112);
- lowconf: published spans that leave every ayah at low confidence, so the aligner comparison runs and wins
  (surah 113, five ayahs, the least the retry needs).
`pilot_published.main`, then `export.main` and `ci.quality_summary`; the aligned JSON, the printed lines, the
exported timing file and quality.md are compared byte for byte. No model, no network.
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent / "golden"))

import golden_cases as gc  # noqa: E402


@pytest.mark.parametrize("name", ["mp3quran-86-112", "fallback", "lowconf"])
def test_golden_run_is_byte_identical(name, tmp_path, monkeypatch, capsys):
    out = gc.run_case(name, tmp_path, monkeypatch, capsys)
    gc.compare_or_update(name, out)


def aligned(name, surah):
    path = gc.GOLDEN / name / "expected" / "aligned" / f"{surah:03d}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def test_the_three_cases_reach_their_paths():
    published = aligned("mp3quran-86-112", 112)
    assert published["source"] == "mp3quran_published" and "refused" not in published["published"]

    fallback = aligned("fallback", 112)
    assert fallback["source"] == "aligner" and "miss ayah(s)" in fallback["published"]["refused"]

    lowconf = aligned("lowconf", 113)
    assert lowconf["source"] == "aligner"
    assert lowconf["published"]["refused"].startswith("published spans leave ")
    stderr = (gc.GOLDEN / "lowconf" / "expected" / "stderr.txt").read_text(encoding="utf-8")
    assert "FALLBACK to the aligner" in stderr


def test_fixtures_hold_no_quran_text():
    """The aligned words are Tanzil text: run_case checks them against the Tanzil file and drops them."""
    paths = list(gc.GOLDEN.rglob("expected/aligned/*.json"))
    assert paths
    for path in paths:
        words = json.loads(path.read_text(encoding="utf-8"))["words"]
        assert all("word" not in w for w in words)

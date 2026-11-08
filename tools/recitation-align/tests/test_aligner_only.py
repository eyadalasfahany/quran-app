"""Aligner-only mode and source folders of scripts/pilot_published.py. Placeholder text; no model, no network.

The aligner, the emissions model, the vocabulary and the audio decoder are replaced by fakes on the loaded
module, so nothing is downloaded and no audio is decoded.
"""

import importlib.util
import json
from pathlib import Path

import numpy as np
import pytest
import torch

from recitation_align import ci
from recitation_align.audio import file_sha256

TOOL_DIR = Path(__file__).resolve().parents[1]
AUDIO_BYTES = b"not really an mp3; the decoder is faked"
DURATION_MS = 4000


def load():
    path = TOOL_DIR / "scripts" / "pilot_published.py"
    spec = importlib.util.spec_from_file_location("pilot_published_aligner_only", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


pp = load()


def fake_words():
    """Two ayahs of surah 1, placeholder words, as align_full returns them."""
    return [
        {"surah": 1, "ayah": 1, "position": 1, "word": "t", "start_ms": 100, "end_ms": 500,
         "confidence": 0.9},
        {"surah": 1, "ayah": 1, "position": 2, "word": "t", "start_ms": 500, "end_ms": 900,
         "confidence": 0.9},
        {"surah": 1, "ayah": 2, "position": 1, "word": "t", "start_ms": 2000, "end_ms": 2600,
         "confidence": 0.8},
    ]


@pytest.fixture
def fakes(monkeypatch):
    """Replace every model and decoder call. Returns a dict that records what the fakes saw."""
    seen = {"cache_paths": [], "pause_paths": [], "aligner_calls": 0}

    def fake_align_full(wav, surah, ayahs, em, pauses):
        seen["aligner_calls"] += 1
        return fake_words(), True, None

    def fake_pauses(audio, sha, cache, noise_db, min_silence_s):
        seen["pause_paths"].append(cache)
        return []

    monkeypatch.setattr(pp, "align_full", fake_align_full)
    monkeypatch.setattr(pp, "compute_emissions", lambda wav: torch.zeros(100, 5))
    monkeypatch.setattr(pp, "load_wav16k", lambda path: np.zeros(16000, dtype=np.float32))
    monkeypatch.setattr(pp, "cached_pauses", fake_pauses)
    monkeypatch.setattr(pp, "load_vocab", lambda: ({}, 0))

    def refuse(*args, **kwargs):
        raise AssertionError("published timings must not be read with --aligner-only")

    monkeypatch.setattr(pp, "normalise", refuse)
    monkeypatch.setattr(pp, "published_refusal", refuse)
    return seen


@pytest.fixture
def inputs(tmp_path):
    """A tiny ingest: one audio file with its real hash, a manifest for moshaf/reciter 7, a Tanzil file."""
    audio_dir = tmp_path / "audio"
    audio_dir.mkdir()
    (audio_dir / "001.mp3").write_bytes(AUDIO_BYTES)
    sha = file_sha256(audio_dir / "001.mp3")
    manifest = {"moshafs": [{"moshaf_id": 7, "files": [{
        "surah": 1, "sha256": sha, "bytes": len(AUDIO_BYTES), "duration_ms": DURATION_MS,
        "url": f"https://audio.test/audio/way2quran/7/001-{sha[:16]}.mp3",
    }]}]}
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    tanzil = tmp_path / "tanzil.txt"
    tanzil.write_text("1|1|t\n1|2|t\n", encoding="utf-8")
    return {"audio_dir": audio_dir, "manifest": manifest_path, "tanzil": tanzil, "root": tmp_path}


def argv_for(inputs, *extra, moshaf="7"):
    root = inputs["root"]
    id_args = [] if moshaf is None else ["--moshaf", moshaf]
    return [*id_args, "--surah", "1", "--manifest", str(inputs["manifest"]),
            "--audio-dir", str(inputs["audio_dir"]), "--raw-dir", str(root / "no-raw-folder"),
            "--out-dir", str(root / "out"), "--emissions-dir", str(root / "emissions"),
            "--pauses-dir", str(root / "pauses"), "--tanzil", str(inputs["tanzil"]), *extra]


# aligner-only mode

def test_aligner_only_never_reads_raw_files_and_labels_the_output_aligner(inputs, fakes):
    assert pp.main(argv_for(inputs, "--aligner-only")) == 0
    doc = json.loads((inputs["root"] / "out" / "001.json").read_text(encoding="utf-8"))
    assert doc["source"] == "aligner"
    assert {a["source"] for a in doc["ayahs"]} == {"aligner"}
    assert doc["published"] == {"none": "aligner-only source"}
    assert [a["ayah"] for a in doc["ayahs"]] == [1, 2]
    assert doc["ayahs"][0]["start_ms"] == 100 and doc["ayahs"][1]["start_ms"] == 2000
    assert doc["ayahs"][1]["end_ms"] == DURATION_MS
    assert fakes["aligner_calls"] == 1


def test_aligner_only_does_not_need_the_raw_folder_to_exist(inputs, fakes):
    argv = argv_for(inputs, "--aligner-only")
    assert not (inputs["root"] / "no-raw-folder").exists()
    assert pp.main(argv) == 0


def test_aligner_only_refuses_fallback_aligner_as_a_contradiction(inputs, fakes):
    with pytest.raises(SystemExit) as err:
        pp.main(argv_for(inputs, "--aligner-only", "--fallback-aligner"))
    assert err.value.code == 2


def test_a_crash_inside_the_aligner_refuses_only_that_surah(inputs, fakes, monkeypatch, capsys):
    def too_long(wav, surah, ayahs, em, pauses):
        raise RuntimeError("CTC targets longer than the frames")

    monkeypatch.setattr(pp, "align_full", too_long)
    assert pp.main(argv_for(inputs, "--aligner-only")) == 1
    assert "001: REFUSED: the aligner cannot fit the file" in capsys.readouterr().err
    assert not (inputs["root"] / "out" / "001.json").exists()


def test_without_the_flag_the_raw_folder_is_still_read(inputs, fakes):
    # The raw folder is missing here, so the published path must fail on reading it (not silently align).
    with pytest.raises(FileNotFoundError):
        pp.main(argv_for(inputs))
    assert fakes["aligner_calls"] == 0


def test_the_quality_table_reads_an_aligner_only_document(inputs, fakes):
    assert pp.main(argv_for(inputs, "--aligner-only")) == 0
    table = ci.quality_summary(inputs["root"] / "out", [1])
    assert "| 1 | aligner | 2 | 3 |" in table
    assert "Ayahs below 0.4: 0." in table


# way2quran needs aligner-only and gets its own folders

def test_way2quran_requires_aligner_only(inputs, fakes):
    with pytest.raises(SystemExit) as err:
        pp.main(argv_for(inputs, "--source-kind", "way2quran"))
    assert err.value.code == 2


def test_way2quran_requires_a_reciter_id(inputs, fakes):
    argv = argv_for(inputs, "--aligner-only", "--source-kind", "way2quran", moshaf=None)
    with pytest.raises(SystemExit) as err:
        pp.main(argv)
    assert err.value.code == 2


def test_the_reciter_flag_is_an_alias_of_moshaf(inputs, fakes):
    argv = argv_for(inputs, "--aligner-only", "--source-kind", "way2quran")
    argv[argv.index("--moshaf")] = "--reciter"
    assert pp.main(argv) == 0


def test_way2quran_and_mp3quran_never_share_an_emissions_file_for_the_same_id(inputs, fakes):
    root = inputs["root"]
    assert pp.main(argv_for(inputs, "--aligner-only")) == 0
    assert pp.main(argv_for(inputs, "--aligner-only", "--source-kind", "way2quran")) == 0
    names = sorted(p.name for p in (root / "emissions").iterdir())
    assert names == ["7-001.npz", "way2quran-7-001.npz"]


def test_emissions_names_keep_the_mp3quran_form_and_prefix_way2quran():
    base = Path("/cache")
    assert pp.emissions_file(base, "mp3quran", 86, 1).name == "86-001.npz"
    assert pp.emissions_file(base, "mp3quran", 253, 114).name == "253-114.npz"
    assert pp.emissions_file(base, "way2quran", 1, 1).name == "way2quran-1-001.npz"
    assert pp.emissions_file(base, "way2quran", 1, 1) != pp.emissions_file(base, "mp3quran", 1, 1)


def test_default_folders_keep_mp3quran_and_namespace_way2quran():
    mp3 = pp.default_dirs("mp3quran", 86, aligner_only=False)
    assert mp3["out"] == pp.TOOL_DIR / "out" / "published" / "86" / "aligned"
    assert mp3["pauses"] == pp.TOOL_DIR / "out" / "published" / "86" / "pauses"
    assert mp3["audio"] == pp.INGEST_OUT / "audio" / "mp3quran-86"
    assert pp.default_dirs("mp3quran", 86, aligner_only=True)["out"].name == "aligner-only"

    way = pp.default_dirs("way2quran", 1, aligner_only=True)
    assert way["out"] == pp.TOOL_DIR / "out" / "way2quran" / "1" / "aligned"
    assert way["pauses"] == pp.TOOL_DIR / "out" / "way2quran" / "1" / "pauses"
    assert way["audio"] == pp.INGEST_OUT / "audio" / "way2quran-1"
    assert way["pauses"] != mp3["pauses"] and way["out"] != mp3["out"]


def test_default_manifest_per_source_is_the_ingest_output():
    assert pp.default_manifest("mp3quran").name == "test-manifest-86.json"
    assert pp.default_manifest("way2quran").name == "dry-way2quran-manifest.json"
    assert pp.default_manifest("way2quran").parent == pp.INGEST_OUT


# quality mode (plan way2quran-quality Q3)

def quality_argv(inputs, *extra):
    return argv_for(inputs, "--aligner-only", "--source-kind", "way2quran", "--quality", *extra)


def completeness_dir(inputs, *, verdict="complete", sha=None):
    folder = inputs["root"] / "completeness"
    folder.mkdir(exist_ok=True)
    real = json.loads(inputs["manifest"].read_text(encoding="utf-8"))["moshafs"][0]["files"][0]["sha256"]
    (folder / "001.json").write_text(json.dumps({"surah": 1, "verdict": verdict, "sha256": sha or real}),
                                     encoding="utf-8")
    return folder


def test_quality_is_refused_for_mp3quran_and_without_aligner_only(inputs, fakes):
    folder = completeness_dir(inputs)
    for argv in (argv_for(inputs, "--aligner-only", "--quality", "--completeness-dir", str(folder)),
                 argv_for(inputs, "--source-kind", "way2quran", "--quality", "--completeness-dir", str(folder))):
        with pytest.raises(SystemExit) as err:
            pp.main(argv)
        assert err.value.code == 2
    with pytest.raises(SystemExit) as err:
        pp.main(quality_argv(inputs))  # no --completeness-dir
    assert err.value.code == 2
    with pytest.raises(SystemExit) as err:
        pp.main(argv_for(inputs, "--aligner-only", "--source-kind", "way2quran",
                         "--completeness-dir", str(folder)))  # the folder without --quality
    assert err.value.code == 2


def test_quality_writes_the_quality_tool_version(inputs, fakes):
    folder = completeness_dir(inputs)
    assert pp.main(quality_argv(inputs, "--completeness-dir", str(folder))) == 0
    doc = json.loads((inputs["root"] / "out" / "001.json").read_text(encoding="utf-8"))
    assert doc["tool_version"] == "0.1.0+q8"


def test_without_quality_the_tool_version_is_the_package_version(inputs, fakes):
    assert pp.main(argv_for(inputs, "--aligner-only", "--source-kind", "way2quran")) == 0
    doc = json.loads((inputs["root"] / "out" / "001.json").read_text(encoding="utf-8"))
    assert doc["tool_version"] == "0.1.0"


@pytest.mark.parametrize("kind", ["missing", "incomplete", "sha"])
def test_quality_refuses_a_missing_incomplete_or_mismatched_record(inputs, fakes, capsys, kind):
    if kind == "missing":
        folder = inputs["root"] / "completeness"
        folder.mkdir()
    elif kind == "incomplete":
        folder = completeness_dir(inputs, verdict="incomplete-end")
    else:
        folder = completeness_dir(inputs, sha="0" * 64)
    assert pp.main(quality_argv(inputs, "--completeness-dir", str(folder))) == 1
    assert not (inputs["root"] / "out" / "001.json").exists()
    assert not (inputs["root"] / "out" / ".." / "refused").exists()
    assert "001: ERROR:" in capsys.readouterr().err
    assert fakes["aligner_calls"] == 0


def test_a_quality_refusal_is_recorded_and_the_run_exits_zero(inputs, fakes, monkeypatch, capsys):
    folder = completeness_dir(inputs)

    def too_long(wav, surah, ayahs, em, pauses):
        raise RuntimeError("CTC targets longer than the frames")

    monkeypatch.setattr(pp, "align_full", too_long)
    refused = inputs["root"] / "refused"
    assert pp.main(quality_argv(inputs, "--completeness-dir", str(folder), "--refused-dir", str(refused))) == 0
    record = json.loads((refused / "001.json").read_text(encoding="utf-8"))
    assert record["stage"] == "aligner" and record["surah"] == 1 and record["schema"] == 1
    assert not (inputs["root"] / "out" / "001.json").exists()
    assert "REFUSED (recorded)" in capsys.readouterr().err


# anchored pass in quality mode (plan way2quran-quality Q4)

REAL_RUN_ANCHORED = pp.run_anchored


@pytest.fixture(autouse=True)
def anchored_pass_through_the_faked_aligner(monkeypatch):
    """Q4 replaces the whole-surah aligner by the anchored pass in quality mode. The Q3 tests above fake only
    `align_full` and write bare completeness records, so by default the anchored pass is stood in for by the
    faked `align_full` (a failure there is an aligner-stage refusal, as in the anchored pass). Tests of the
    anchored wiring restore REAL_RUN_ANCHORED."""
    def stand_in(surah, args, *, sha, wav, em, pauses, ayahs, vocab, blank):
        words, recited, _ = pp.align_full(wav, surah, ayahs, em=em, pauses=pauses)
        return words, recited, {"stand_in": True}

    monkeypatch.setattr(pp, "run_anchored", stand_in)


def full_completeness_dir(inputs):
    """A completeness record with the window fields the anchored pass reads (one head and one tail window)."""
    folder = inputs["root"] / "completeness"
    folder.mkdir(exist_ok=True)
    real = json.loads(inputs["manifest"].read_text(encoding="utf-8"))["moshafs"][0]["files"][0]["sha256"]
    (folder / "001.json").write_text(json.dumps({
        "surah": 1, "verdict": "complete", "sha256": real, "first_sound_s": 0.0, "last_sound_s": 1.0,
        "windows": {"head": 1, "tail": 1}}), encoding="utf-8")
    return folder


@pytest.fixture
def anchored(monkeypatch):
    """The real run_anchored with a fake ASR cache call and a fake anchored_align. Records what they saw."""
    seen = {"asr": [], "anchored": 0}
    monkeypatch.setattr(pp, "run_anchored", REAL_RUN_ANCHORED)

    def fake_at(wav, sha, cache_path, windows):
        seen["asr"].append((cache_path, list(windows)))
        return {"windows": [{"start_s": s, "end_s": e, "text": ""} for s, e in windows]}

    def fake_anchored_align(em, surah, ayahs, vocab, blank, **kw):
        seen["anchored"] += 1
        seen["windows"] = kw["windows"]
        return fake_words(), True, {"every": 4, "windows": len(kw["windows"]), "checkpoints": [], "cuts": [],
                                    "merges": [], "seconds": {"locate": 0.0}}

    monkeypatch.setattr(pp.asr, "cached_transcribe_at", fake_at)
    monkeypatch.setattr(pp, "anchored_align", fake_anchored_align)
    return seen


def test_quality_calls_the_asr_cache_and_writes_the_anchors_key(inputs, fakes, anchored):
    folder = full_completeness_dir(inputs)
    asr_dir = inputs["root"] / "asr"
    assert pp.main(quality_argv(inputs, "--completeness-dir", str(folder), "--asr-dir", str(asr_dir))) == 0
    assert anchored["anchored"] == 1 and fakes["aligner_calls"] == 0
    cache_path, windows = anchored["asr"][0]
    assert cache_path == asr_dir / "001.json"
    assert windows == [(0.0, 1.0)]  # the completeness head/tail window is reused, by its exact key
    doc = json.loads((inputs["root"] / "out" / "001.json").read_text(encoding="utf-8"))
    assert list(doc)[-1] == "anchors"
    assert doc["anchors"]["every"] == 4 and "asr" in doc["anchors"]["seconds"]


def test_without_quality_neither_the_asr_nor_the_anchors_key(inputs, fakes, anchored):
    assert pp.main(argv_for(inputs, "--aligner-only", "--source-kind", "way2quran")) == 0
    assert anchored["asr"] == [] and anchored["anchored"] == 0 and fakes["aligner_calls"] == 1
    doc = json.loads((inputs["root"] / "out" / "001.json").read_text(encoding="utf-8"))
    assert "anchors" not in doc


def test_the_asr_dir_needs_quality(inputs, fakes):
    with pytest.raises(SystemExit) as err:
        pp.main(argv_for(inputs, "--aligner-only", "--source-kind", "way2quran", "--asr-dir", "x"))
    assert err.value.code == 2


def test_the_default_asr_dir_is_the_one_completeness_writes():
    assert pp.default_dirs("way2quran", 3, aligner_only=True)["asr"] == pp.TOOL_DIR / "out" / "way2quran" / "3" / "asr"


def test_the_fail_safe_is_recorded_with_stage_anchors(inputs, fakes, anchored, monkeypatch, capsys):
    folder = full_completeness_dir(inputs)

    def insufficient(*_a, **_k):
        raise pp.AnchorsInsufficient("0 checkpoints for 1200 s of audio (need 2)")

    monkeypatch.setattr(pp, "anchored_align", insufficient)
    refused = inputs["root"] / "refused"
    assert pp.main(quality_argv(inputs, "--completeness-dir", str(folder), "--refused-dir", str(refused),
                                "--asr-dir", str(inputs["root"] / "asr"))) == 0
    record = json.loads((refused / "001.json").read_text(encoding="utf-8"))
    assert record["stage"] == "anchors" and "checkpoints" in record["reason"]
    assert not (inputs["root"] / "out" / "001.json").exists()
    assert fakes["aligner_calls"] == 0  # never a fallback to the drifting aligner


def test_an_anchored_alignment_failure_is_an_aligner_refusal(inputs, fakes, anchored, monkeypatch):
    folder = full_completeness_dir(inputs)

    def no_cut_left(*_a, **_k):
        raise RuntimeError("segmented alignment failed with no cut left")

    monkeypatch.setattr(pp, "anchored_align", no_cut_left)
    refused = inputs["root"] / "refused"
    assert pp.main(quality_argv(inputs, "--completeness-dir", str(folder), "--refused-dir", str(refused),
                                "--asr-dir", str(inputs["root"] / "asr"))) == 0
    assert json.loads((refused / "001.json").read_text(encoding="utf-8"))["stage"] == "aligner"

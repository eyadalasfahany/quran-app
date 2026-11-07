"""Shared definitions and runner for the model-free golden runs (plan way2quran-quality, step Q0).

Used by `make_golden.py` (builds the fixtures once, locally) and by `test_golden_mp3quran.py` and
`test_golden_way2quran.py` (compare a fresh run with the committed expected files, byte for byte).

A case folder holds `inputs/` (manifest.json, audio/NNN.mp3 stubs, emissions/*.npz, pauses/*.pauses.json,
raw/raw-N.json) and `expected/` (aligned/NNN.json, stdout.txt, stderr.txt, timing/NNN.json, quality.md).
No model and no network: `load_wav16k` returns zeros and the processor is a stub over `vocab.json`.
The Tanzil text is read from the repository's Tanzil file at run time; the fixtures hold ids, numbers and
timings only.
"""

import importlib.util
import json
import shutil
import types
from pathlib import Path

import numpy as np

GOLDEN = Path(__file__).resolve().parent
TOOL = GOLDEN.parents[1]
REPO = TOOL.parents[1]
TANZIL = REPO / "packages/quran-text-check/data/tanzil-quran-simple-1.1.txt"
VOCAB = GOLDEN / "vocab.json"
SAMPLE_RATE = 16000

# kind: the `--source-kind`. ident: the moshaf or Way2Quran reciter id. flags: extra pilot_published flags.
CASES = {
    "mp3quran-86-112": {"kind": "mp3quran", "ident": 86, "surahs": [112], "flags": ["--fallback-aligner"],
                        "export_source": "mp3quran_published"},
    "fallback": {"kind": "mp3quran", "ident": 86, "surahs": [112], "flags": ["--fallback-aligner"],
                 "export_source": "mp3quran_published"},
    "lowconf": {"kind": "mp3quran", "ident": 86, "surahs": [113], "flags": ["--fallback-aligner"],
                "export_source": "mp3quran_published"},
    "way2quran": {"kind": "way2quran", "ident": 9, "surahs": [112], "flags": ["--aligner-only"],
                  "export_source": "aligner"},
}


def load_script(name: str):
    spec = importlib.util.spec_from_file_location(name, TOOL / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def install_stubs(monkeypatch, durations_ms: dict[int, int]) -> None:
    """No model, no network: zeros for the audio, the committed vocabulary for the processor."""
    from transformers import Wav2Vec2Processor

    from recitation_align import align

    vocab = json.loads(VOCAB.read_text(encoding="utf-8"))
    stub = types.SimpleNamespace(tokenizer=types.SimpleNamespace(get_vocab=lambda: dict(vocab)))
    monkeypatch.setattr(Wav2Vec2Processor, "from_pretrained", classmethod(lambda cls, *a, **k: stub))

    def no_model(*_a, **_k):
        raise AssertionError("a golden run must not load or run a model")

    monkeypatch.setattr(align, "_load", no_model)
    monkeypatch.setattr(align, "compute_emissions", no_model)

    pilot = load_script("pilot_published")

    def fake_wav(path):
        return np.zeros(round(durations_ms[int(Path(path).stem)] / 1000 * SAMPLE_RATE), dtype=np.float32)

    monkeypatch.setattr(pilot, "load_wav16k", fake_wav)
    monkeypatch.setattr(pilot, "compute_emissions", no_model)
    return pilot


def run_case(name: str, work: Path, monkeypatch, capsys) -> Path:
    """Run one case in `work` and return the folder of its fresh outputs (same layout as `expected/`)."""
    from recitation_align import ci, export

    case = CASES[name]
    inputs = work / "inputs"
    shutil.copytree(GOLDEN / name / "inputs", inputs)
    manifest = json.loads((inputs / "manifest.json").read_text(encoding="utf-8"))
    durations = {f["surah"]: f["duration_ms"] for m in manifest["moshafs"] for f in m["files"]}
    pilot = install_stubs(monkeypatch, durations)

    out = work / "outputs"
    aligned = work / "aligned-full"  # the written files, with the words; export reads these
    argv = ["--source-kind", case["kind"], "--moshaf", str(case["ident"]), "--manifest", str(inputs / "manifest.json"),
            "--audio-dir", str(inputs / "audio"), "--raw-dir", str(inputs / "raw"), "--out-dir", str(aligned),
            "--emissions-dir", str(inputs / "emissions"), "--pauses-dir", str(inputs / "pauses"),
            "--tanzil", str(TANZIL), *case["flags"]]
    for surah in case["surahs"]:
        argv += ["--surah", str(surah)]
    code = pilot.main(argv)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    out.mkdir(parents=True, exist_ok=True)
    strip_words(aligned, out / "aligned")
    (out / "stdout.txt").write_text(captured.out, encoding="utf-8")
    # Drop platform noise (a torch import warning on macOS) so the golden is the same on every runner.
    err = "".join(line for line in captured.err.splitlines(keepends=True) if "torch/distributed" not in line)
    (out / "stderr.txt").write_text(err, encoding="utf-8")

    code = export.main(["--kind", case["kind"], "--recitation-key", str(case["ident"]), "--in", str(aligned),
                        "--out", str(out / "timing"), "--manifest", str(inputs / "manifest.json"),
                        "--tanzil", str(TANZIL), "--source", case["export_source"]])
    capsys.readouterr()
    assert code == 0
    (out / "quality.md").write_text(ci.quality_summary(aligned, sorted(case["surahs"])), encoding="utf-8")
    return out


def strip_words(src: Path, dst: Path) -> None:
    """Copy each aligned file without its `word` field, after checking that field against the Tanzil file.

    The golden files must not hold Quran text, so the word text is verified here (read from the repository's
    Tanzil file at run time) and left out of what is compared.
    """
    from recitation_align.text import load_tanzil

    ayahs = load_tanzil(TANZIL)
    dst.mkdir(parents=True, exist_ok=True)
    for path in sorted(src.glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        for w in doc["words"]:
            assert w["word"] == ayahs[(w["surah"], w["ayah"])].split(" ")[w["position"] - 1]
            del w["word"]
        (dst / path.name).write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def tree(root: Path) -> dict[str, bytes]:
    return {p.relative_to(root).as_posix(): p.read_bytes() for p in sorted(root.rglob("*")) if p.is_file()}


def compare_or_update(name: str, out: Path) -> None:
    """Byte-for-byte comparison with `expected/`. `UPDATE_GOLDEN=1` rewrites `expected/` from `out` instead."""
    import os

    expected = GOLDEN / name / "expected"
    if os.environ.get("UPDATE_GOLDEN") == "1":
        shutil.rmtree(expected, ignore_errors=True)
        shutil.copytree(out, expected)
    want, got = tree(expected), tree(out)
    assert sorted(got) == sorted(want)
    for rel in want:
        assert got[rel] == want[rel], f"{name}/{rel} differs from the golden file"

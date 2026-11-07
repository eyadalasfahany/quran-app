"""Build the golden fixtures once, locally (plan way2quran-quality, step Q0). Not run by pytest.

    cd tools/recitation-align && HF_HUB_OFFLINE=1 uv run python tests/golden/make_golden.py --audio-dir DIR

DIR holds MP3Quran moshaf 86's `112` and `113` files under their ingest names (`112-e254e409698b5d3c.mp3`,
fetched from the `url` of `mp3quran-ingest/out/test-manifest-86.json`); each file's sha256 is checked against
that manifest. The audio is read here and never committed.

1. Extracts `vocab.json` from the pinned align processor (P19: the model-free runs stub the processor with it).
2. For each case, computes real emissions with the cached align model, and real pauses with ffmpeg, from the
   audio. Both are stored under the sha256 of a stub audio file (arbitrary bytes, never decoded), so the tests
   find them without the audio. Emissions are rounded to 0.001 to keep the files small.
3. Copies the real published rows (`out/published/86/raw-N.json`) for the published case. The `fallback` case
   drops one ayah's row, so `published_refusal` refuses the surah. The `lowconf` case replaces the starts with
   ones found by a seeded random search, so every ayah's span holds the wrong audio.
4. The expected files are written by the golden tests themselves: `UPDATE_GOLDEN=1 uv run pytest -q
   tests/test_golden_mp3quran.py tests/test_golden_way2quran.py` (the same code path the tests compare).

Surahs: 112 (the published path, `fallback`, and the Way2Quran case, which reuses moshaf 86's file under a
placeholder reciter id) and 113 (five ayahs, the least the low-confidence retry needs; the audio is 19 s).
The fixtures keep ids, numbers and timings only. No Quran text is copied: the words are read from the
repository's Tanzil file when the tests run.
"""

import argparse
import hashlib
import json
import random
import shutil
import sys
from pathlib import Path

import numpy as np
import torch

GOLDEN = Path(__file__).resolve().parent
sys.path.insert(0, str(GOLDEN))
sys.path.insert(0, str(GOLDEN.parents[1]))

import golden_cases as gc  # noqa: E402

from recitation_align.align import compute_emissions, emission_key  # noqa: E402
from recitation_align.apply_marks import ms_per_frame  # noqa: E402
from recitation_align.audio import file_sha256, load_wav16k  # noqa: E402
from recitation_align.pauses import DEFAULT_MIN_SILENCE_S, DEFAULT_NOISE_DB, detect_pauses  # noqa: E402
from recitation_align.published import normalise  # noqa: E402
from recitation_align.text import load_tanzil  # noqa: E402

REAL_MANIFEST = gc.REPO / "tools/mp3quran-ingest/out/test-manifest-86.json"
REAL_RAW = gc.TOOL / "out/published/86"
# The fallback case: ayah 3 has no published row, so `published_refusal` refuses the surah.
DROP_PUBLISHED_AYAH = {"fallback": 3}
LOWCONF_SEED = 1


def extract_vocab() -> dict:
    from transformers import Wav2Vec2Processor

    from recitation_align.models import ALIGN_MODEL, ALIGN_REVISION

    vocab = Wav2Vec2Processor.from_pretrained(ALIGN_MODEL, revision=ALIGN_REVISION).tokenizer.get_vocab()
    gc.VOCAB.write_text(json.dumps(dict(sorted(vocab.items(), key=lambda kv: kv[1])), ensure_ascii=False,
                                   indent=0) + "\n", encoding="utf-8")
    return vocab


def real_files() -> dict[int, dict]:
    manifest = json.loads(REAL_MANIFEST.read_text(encoding="utf-8"))
    return {f["surah"]: f for f in manifest["moshafs"][0]["files"]}


def real_audio(audio_dir: Path, entry: dict) -> Path:
    path = audio_dir / Path(entry["key"]).name
    if file_sha256(path) != entry["sha256"]:
        raise SystemExit(f"{path} does not match the ingest manifest sha256")
    return path


def lowconf_starts(surah: int, em: torch.Tensor, ayahs: dict, vocab: dict, duration_ms: int) -> dict[int, int]:
    """Published starts (ayahs 2..N) that leave at least 5 ayahs below the confidence floor. Seeded search."""
    pilot = gc.load_script("pilot_published")
    n = sum(1 for s, _ in ayahs if s == surah)
    mpf = ms_per_frame(duration_ms, em.shape[0])
    rng = random.Random(LOWCONF_SEED)
    while True:
        frames = sorted(rng.sample(range(5, em.shape[0] - 5), n - 1))
        starts = {1: 0, **{a: round(f * mpf) for a, f in zip(range(2, n + 1), frames)}}
        if any(starts[a + 1] - starts[a] < 400 for a in range(1, n)) or duration_ms - starts[n] < 800:
            continue
        rows = [{"ayah": a, "start_time": starts[a], "end_time": starts[a + 1] if a < n else duration_ms}
                for a in range(1, n + 1)]
        norm = normalise(rows, surah=surah, verse_count=n, duration_ms=duration_ms)
        try:
            words, _ = pilot.align_in_spans(surah, norm, ayahs=ayahs, em=em, mpf=mpf, vocab=vocab,
                                            blank=vocab["<pad>"])
        except Exception:  # noqa: BLE001 - a span the aligner cannot fit is not a candidate
            continue
        if pilot.low_count(words) >= pilot.MIN_LOW_FOR_RETRY:
            return {a: starts[a] for a in range(2, n + 1)}


def build_case(name: str, audio_dir: Path, ayahs: dict, vocab: dict, cache: dict) -> None:
    case = gc.CASES[name]
    root = gc.GOLDEN / name
    shutil.rmtree(root, ignore_errors=True)
    inputs = root / "inputs"
    entries = real_files()
    files = []
    for surah in sorted(case["surahs"]):
        entry = entries[surah]
        duration_ms = entry["duration_ms"]
        if surah not in cache:
            audio = real_audio(audio_dir, entry)
            em = torch.from_numpy(np.round(compute_emissions(load_wav16k(audio)).numpy(), 3).astype(np.float32))
            cache[surah] = (em, detect_pauses(audio, DEFAULT_NOISE_DB, DEFAULT_MIN_SILENCE_S))
        em, pauses = cache[surah]
        stub = f"GOLDEN STUB AUDIO, NOT AUDIO: case {name} surah {surah:03d}\n".encode()
        sha = hashlib.sha256(stub).hexdigest()
        (inputs / "audio").mkdir(parents=True, exist_ok=True)
        (inputs / "audio" / f"{surah:03d}.mp3").write_bytes(stub)
        prefix = str(case["ident"]) if case["kind"] == "mp3quran" else f"way2quran-{case['ident']}"
        (inputs / "emissions").mkdir(parents=True, exist_ok=True)
        np.savez_compressed(inputs / "emissions" / f"{prefix}-{surah:03d}.npz", key=np.array(emission_key(sha)),
                            em=em.numpy())
        (inputs / "pauses").mkdir(parents=True, exist_ok=True)
        (inputs / "pauses" / f"{surah:03d}.pauses.json").write_text(json.dumps({
            "key": f"{sha}|{DEFAULT_NOISE_DB}|{DEFAULT_MIN_SILENCE_S}",
            "pauses": [[s, e] for s, e in pauses]}), encoding="utf-8")
        if case["kind"] == "mp3quran":
            raw = json.loads((REAL_RAW / f"raw-{surah}.json").read_text(encoding="utf-8"))
            if name == "lowconf":
                starts = lowconf_starts(surah, em, ayahs, vocab, duration_ms)
                n = len(starts) + 1
                raw = [{"ayah": a, "start_time": 0 if a == 1 else starts[a],
                        "end_time": starts[a + 1] if a < n else duration_ms} for a in range(1, n + 1)]
            raw = [r for r in raw if r["ayah"] != DROP_PUBLISHED_AYAH.get(name)]
            (inputs / "raw").mkdir(parents=True, exist_ok=True)
            (inputs / "raw" / f"raw-{surah}.json").write_text(json.dumps(raw, separators=(",", ":")),
                                                              encoding="utf-8")
        files.append({"bytes": len(stub), "duration_ms": duration_ms,
                      "key": f"audio/{case['kind']}/{case['ident']}/{surah:03d}-{sha[:16]}.mp3",
                      "sha256": sha, "surah": surah,
                      "url": f"https://audio.example.test/audio/{case['kind']}/{case['ident']}/{surah:03d}-{sha[:16]}.mp3"})
    (inputs / "manifest.json").write_text(json.dumps(
        {"moshafs": [{"moshaf_id": case["ident"], "files": files}]}, indent=2) + "\n", encoding="utf-8")
    if not (inputs / "raw").exists():
        (inputs / "raw").mkdir()
        (inputs / "raw" / ".gitkeep").write_text("", encoding="utf-8")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--audio-dir", type=Path, required=True)
    p.add_argument("cases", nargs="*", default=list(gc.CASES))
    args = p.parse_args()
    vocab = extract_vocab()
    ayahs = load_tanzil(gc.TANZIL)
    cache: dict = {}
    for name in args.cases:
        build_case(name, args.audio_dir, ayahs, vocab, cache)
        print(f"built inputs of {name}", file=sys.stderr)
    print("now: UPDATE_GOLDEN=1 uv run pytest -q tests/test_golden_mp3quran.py tests/test_golden_way2quran.py",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# recitation-align

Local dev tool. It gives word-level timings for one recitation file, matched to Tanzil text.

**Local only. It never runs on Railway or any server** (ADR 0052, decision 2: no audio analysis on the server). It writes JSON that a developer reviews before any timing goes into the content pipeline.

## What it does

1. Reads the audio (mp3, wav, or any ffmpeg input) and converts it to 16 kHz mono with ffmpeg when needed.
2. Either uses a surah number you give it (`--surah`), or finds the surah by transcribing with Whisper and matching the text against Tanzil.
3. Runs forced alignment (wav2vec2 CTC, `torchaudio.functional.forced_align`) of the surah's words against the audio.

Everything runs on CPU.

## Setup

```bash
export PATH=/opt/homebrew/bin:$PATH   # uv and ffmpeg live here
cd tools/recitation-align
uv sync
uv run pytest -q
```

The first run downloads about 1.5 GB of models to the Hugging Face cache (`~/.cache/huggingface`). Both models are pinned to a revision (see `recitation_align/models.py`).

## Usage

```bash
# Known surah (main path for QF files). Skips speech recognition.
uv run recitation-align run AUDIO.mp3 --surah 59 --out out/059.json

# Unknown surah (transcribe, identify, then align).
uv run recitation-align run AUDIO.mp3 --out out/unknown.json
```

Options: `--tanzil PATH` (default: `packages/quran-text-check/data/tanzil-quran-simple-1.1.txt`), `--surah N` (1–114), `--out OUT.json` (default `out/<audio name>.json` in the current folder). The command prints a per-ayah table.

Audio files are rights-restricted. Keep them out of git. The root `.gitignore` ignores `/*.mp3`, `/*.wav` and `out/`.

## Output

```json
{
  "tool_version": "0.1.0",
  "asr_model": {"id": "...", "revision": "..."} or null when --surah is used,
  "align_model": {"id": "...", "revision": "..."},
  "audio": {"file": "059.mp3", "bytes": 0, "sha256": "...", "duration_ms": 0},
  "surah": 59,
  "identify": {"score": 0.0, "candidates": [{"surah": 59, "score": 0.0}]} or null when --surah is used,
  "words": [
    {"surah": 59, "ayah": 1, "position": 1, "word": "...", "basmala": false,
     "start_ms": 0, "end_ms": 0, "confidence": 0.0}
  ]
}
```

- `word` is the original Tanzil token, unchanged. Normalisation is only the matching key.
- `position` is the 1-based index of the token in the original space-split ayah line. Tokens that normalise to nothing (waqf marks such as ۖ) are not aligned, so a surah's positions can have gaps. This is intended.
- The basmala is not added as a separate entry. Tanzil keeps it inside ayah 1 of every surah except 1 and 9. When ayah 1 starts with the text of 1:1, the first N words of ayah 1 get `basmala: true`, where N is the word count of 1:1.

## Models and licences

| Model | Revision | Licence |
|---|---|---|
| `tarteel-ai/whisper-base-ar-quran` (ASR) | `5c3c53fd…` | Apache-2.0 |
| `jonatasgrosman/wav2vec2-large-xlsr-53-arabic` (alignment) | `af46c2d8…` | Apache-2.0 |

Both models were last updated in December 2022. This is a dev-only tool that is never shipped, so the rule on dependency age (a release in the last 12 months) is for the developer to confirm.

## QF files

Timings for QF files must come from the exact audio URL in `chapter_audio_files`. The plan for that step is still to be written. Do not reuse a timing file for a different URL or file.

## Committed timing files

`recitation_align.export` turns aligner output (`NNN.json`) into the committed timing file the API imports. It runs on the developer's machine, needs no torch, and never touches MySQL. The QF word-count check is done by the API importer, not here.

```bash
uv run python -m recitation_align.export --kind mp3quran --recitation-key 253 --in out/253-v7 \
  --out ../../apps/api/resources/recitation-timings/mp3quran/253 [--surah 59 ...] [--source aligner]
uv run python -m recitation_align.export --kind qf --recitation-key 174 --in out/174 \
  --urls urls.json --out ../../apps/api/resources/recitation-timings/qf/174
```

- `--kind mp3quran` checks the aligner's `audio.sha256` and `audio.bytes` against `apps/api/resources/mp3quran/manifest.json` and writes that entry's URL. `--kind qf` needs `--urls`, a JSON object `{"<chapter>": "<audio URL>"}` from `chapter_audio_files`.
- Output is `NNN.json` per surah: one minified UTF-8 object, format 1 (`format`, `kind`, `recitation_key`, `chapter_id`, `audio`, `source`, `tool_version`, `models`, `original_first_start_ms`, `ayahs`). Each ayah row has `verse_key`, `verse_id`, `start_ms`, `end_ms` and `segments` as `[qf_position, start_ms, end_ms]` triples.
- A surah that fails a check is refused: one line `NNN: reason` on stderr, no file written, exit code 1. The other selected surahs are still written.
- Tests: `uv run pytest -q tests/test_export.py`.

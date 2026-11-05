# API step 02a (plan A1 output format, first half of A3): aligner output to committed timing files

Branch `ft/recitation-timings`. Do not commit, push, switch branches or add dependencies. Plan: `docs/plans/recitation-timings.md` ("API steps"). Rests on ADR 0060 decisions 2, 3, 8 and the plan's "Word positions" finding. **Never write Quran text** in code comments, tests or fixtures: test tokens are placeholders (`w1`, `w2`); the only Arabic you write is the module constant for the vocative particle (a bare particle, not a verse).

## Read first

`.claude/agent-rules.md`, `CLAUDE.md`, `tools/recitation-align/README.md` (output shape), `tools/recitation-align/recitation_align/text.py` (`load_tanzil`), `tools/recitation-align/recitation_align/cli.py` (style of argparse, only to copy conventions), `apps/api/resources/mp3quran/manifest.json` (shape: top-level `schema`, `source`, `public_base`, `moshafs[]`; each moshaf has `moshaf_id` and `files[]` of `{surah, key, url, bytes, sha256, duration_ms, ...}`).

The prototype of the conversion (a scratch file that may no longer exist; if it is missing, the rules written in this brief are complete and authoritative) was `<session scratchpad>/local_import.py` (function `qf_words` and the ayah-row loop). Reproduce its particle test exactly (it strips only U+064E fatha before comparing). Do not "improve" it with `norm()`: the 6,215 of 6,236 verses that match QF's word counts were measured with that test.

Environment (this Mac): `export PATH=/opt/homebrew/bin:$PATH`; `cd tools/recitation-align`; run with `uv run ...`. `cli.py` and other files in `recitation_align/` have uncommitted work from another agent: **create new files only; do not edit `cli.py`, `pyproject.toml` or any existing module.**

## Goal

A new module `recitation_align/export.py`, run as `uv run python -m recitation_align.export`, that reads the aligner's per-surah JSON and writes the **committed timing form** the API imports (step 02b): one minified JSON file per recitation and surah, holding ayah rows and word segments already mapped to QF word positions, plus provenance. It runs on the developer's machine only, needs no torch (import only `recitation_align.text`; `recitation_align/__init__.py` imports nothing heavy), and never touches MySQL. The QF word count check is **not** done here: the PHP importer checks every verse against `word_layouts` (this tool cannot reach MySQL in CI), so this module only maps positions.

## Files

- Create `tools/recitation-align/recitation_align/export.py`
- Create `tools/recitation-align/tests/test_export.py`
- Create `tools/recitation-align/tests/fixtures/` only if you need fixture files (prefer building fixtures in the test with `tmp_path`).
- Add one short section "Committed timing files" to `tools/recitation-align/README.md` (the command and the file format; no Arabic).

## Command

```
uv run python -m recitation_align.export \
  --kind mp3quran|qf  --recitation-key KEY  --in DIR  --out DIR \
  [--manifest PATH]  [--urls PATH]  [--tanzil PATH]  [--surah N ...]  [--source aligner]
```

- `--kind`: `mp3quran` (key = moshaf id as text, e.g. `253`) or `qf` (key = QF chapter reciter id as text, e.g. `174`).
- `--in`: a folder of `NNN.json` aligner outputs (the developer picks which; `apply-marks` writes `out/253-v8` by default, `out/253-v7` exists today). Only files named `NNN.json` are read; `.log` files are ignored.
- `--out`: the destination folder; the developer passes `../../apps/api/resources/recitation-timings/{kind}/{key}`. Created if missing. Files are written as `NNN.json` (surah zero-padded to 3).
- `--manifest` (required for `mp3quran`): default `Path(__file__).resolve().parents[3] / 'apps/api/resources/mp3quran/manifest.json'` (defined in `export.py`; not relative to the working directory). The surah's entry is found by `moshaf_id == key` and `surah`. The converter **refuses** the surah (error, no file written) unless the aligner's `audio.sha256` and `audio.bytes` equal the entry's `sha256` and `bytes`, and the entry's `url` ends with `/{NNN}-{sha256[:16]}.mp3`. The audio URL written is the entry's `url`.
- `--urls` (required for `qf`): a JSON object `{"<chapter>": "<audio_url>"}` the developer exports from `chapter_audio_files`. A surah with no entry is refused. The URL is written verbatim.
- `--tanzil`: default `Path(__file__).resolve().parents[1] / '../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt'` resolved, **defined in `export.py` itself**. Never `import` anything from `recitation_align.cli`, `align` or any module that imports torch (`cli.py` does): the converter imports only `recitation_align.text` and the standard library. Used only for each surah's ayah count and the global verse id. Tanzil lines are `surah|ayah|text` in canonical order; `verse_id` is the 1-based line index (1 to 6,236), the same id QF uses.
- `--surah`: repeatable; default every `NNN.json` in `--in`.
- `--source`: default `aligner`. The only other legal value is `mp3quran_published` (reserved for plan step B6); validate against that list and write it through.
- Exit code 0 only when every selected surah was written; otherwise print one line per refused surah (`NNN: reason`) and exit 1. A refused surah never leaves a partial file. Output is written to a temp name in `--out` then renamed.

## Input contract (aligner output)

Per file, required: `surah` (int, equals the file name), `tool_version` (str), `align_model` (`{id, revision}`), `audio` (`{bytes, sha256, duration_ms}` with `duration_ms` the **measured** duration), `words` (list). Required per word: `surah`, `ayah`, `position`, `word`, `start_ms`, `end_ms`. Optional and tolerated: top-level `asr_model` (null when `--surah` was used), `identify`, `basmala_recited`, `repairs`, `manual_marks`; per word `basmala` (**a missing key means false**: surahs 1 and 9 carry no flag), `confidence`, `snapped`. Unknown keys are ignored. A missing required key refuses the surah.

## Mapping rules (exact)

1. **Drop basmala words.** Ignore every word with `basmala` true. (Surah 1's first ayah is itself the basmala and is not flagged, so nothing is dropped there.) Waqf tokens never appear in the input (they normalise to nothing and are not aligned), so they are already dropped; their absence leaves gaps in `position`.
2. **Tanzil position to QF position, per ayah.** Take the ayah's distinct `position` values in ascending order. Walk them: the QF position is the 1-based count of positions walked so far, except that a **standalone vocative particle** token and the next distinct position share one QF position (the pair counts once). A token is the particle when `token["word"].replace("َ", "") == VOCATIVE` where `VOCATIVE = "يا"` (a module constant) and a next distinct position exists in the same ayah. Build `qmap: dict[tanzil_position -> qf_position]` first, from the first entry seen for each position.
3. **Segments.** Walk the ayah's non-basmala entries in the given order (the order is the recited order; repeated positions can appear once A9 lands). For an entry that is the particle and is immediately followed by the entry holding the next distinct position, emit one triple `[qmap[position], particle.start_ms, next.end_ms]` and skip the next entry. Every other entry emits `[qmap[position], start_ms, end_ms]`. All values are ints. For monotonic data this equals the prototype (`i + 1` over merged tokens).
4. **Ayah rows** (ADR 0060 decision 8, QF convention). Ayah 1 `start_ms` is **0** whatever precedes the first word (an audible basmala falls inside ayah 1's span and has no segment). Ayah n (n >= 2) `start_ms` is the `start_ms` of its first non-basmala entry. Ayah n `end_ms` is ayah n+1's `start_ms`. The last ayah's `end_ms` is `audio.duration_ms`. Rows are contiguous by construction. Every ayah of the surah (count from Tanzil) must have at least one non-basmala word; otherwise refuse the surah (`missing ayah N`). Refuse when any row has `start_ms >= end_ms`, when ayah starts are not strictly increasing, or when the Tanzil file has no such surah. A surah with more ayahs in the input than in Tanzil is refused.
5. `segments` is always a list of triples here; it is never null (the importer decides nulls after its word-count check). A triple with `start_ms >= end_ms` is a refusal.
6. `original_first_start_ms` is `null` for source `aligner`.

## Committed file format (version 1)

One minified UTF-8 JSON object (`json.dumps(obj, ensure_ascii=False, separators=(",", ":"))`, no trailing newline, keys in exactly this order; the same input gives the same bytes):

```json
{"format":1,"kind":"mp3quran","recitation_key":"253","chapter_id":59,
 "audio":{"url":"https://audio.taybah-app.com/audio/mp3quran/253/059-f0b5d093352295a0.mp3","bytes":8680138,"sha256":"f0b5d093352295a06b1e1f756e4ec815939bc07aed4753a07f82ec15351e6176","measured_duration_ms":541936},
 "source":"aligner","tool_version":"0.1.0",
 "models":{"align":{"id":"jonatasgrosman/wav2vec2-large-xlsr-53-arabic","revision":"af46c2d8531b8dcbb5e23b952f739b372c2e5d2d"},"asr":null},
 "original_first_start_ms":null,
 "ayahs":[
  {"verse_key":"59:1","verse_id":5127,"start_ms":0,"end_ms":14655,"segments":[[1,6427,6967],[2,7107,7728],[3,7888,8068]]},
  {"verse_key":"59:2","verse_id":5128,"start_ms":14655,"end_ms":57919,"segments":[[1,14655,14815]]}
 ]}
```

(The sample is shown on separate lines and with the segment lists cut short for reading; the real file is one line and lists every word. `verse_id` 5127 is 59:1; the sample numbers come from `out/253-v7/059.json`.) Field rules: `format` int 1; `kind` the `--kind`; `recitation_key` a string; `chapter_id` int; `audio.url` string; `models.asr` is the `asr_model` object or null; `ayahs` in verse order, `verse_key` is `"{chapter}:{ayah}"`, `verse_id` the global id, ayah numbers `1..count`.

## Tests (`tests/test_export.py`, pytest, no model, no network)

Build a tiny Tanzil file in `tmp_path` (three surahs of 2, 3 and 2 placeholder ayahs, lines `1|1|t`) and aligner dicts of placeholder words. Names:

- `test_ayah_rows_are_contiguous_and_last_ends_at_measured_duration`
- `test_ayah_one_starts_at_zero_even_when_first_word_starts_later`
- `test_basmala_words_are_dropped_and_missing_flag_means_not_basmala`
- `test_waqf_gaps_in_positions_give_consecutive_qf_positions`
- `test_vocative_particle_merges_with_next_token_into_one_position` (build the particle token from `export.VOCATIVE`, optionally with a fatha U+064E added, and prove a token with another diacritic is not merged, to pin the exact rule)
- `test_particle_as_last_token_is_not_merged`
- `test_repeated_positions_keep_the_recited_order_and_reuse_the_qf_position` (positions 1,2,3,2,3,4: segments carry QF positions 1,2,3,2,3,4)
- `test_verse_id_is_global_line_index` (on the fixture; plus `test_verse_id_of_first_ayah_of_surah_59_is_5127` using the real Tanzil file, skipped with `pytest.mark.skipif` when `DEFAULT_TANZIL` is missing)
- `test_missing_ayah_refuses_the_surah_and_writes_nothing`
- `test_row_with_start_not_before_end_refuses`
- `test_mp3quran_refuses_when_sha256_or_bytes_differ_from_manifest` and `test_mp3quran_refuses_when_url_hash_part_is_not_the_sha_prefix`
- `test_qf_requires_a_url_for_the_chapter`
- `test_output_is_minified_key_ordered_and_byte_identical_on_rerun`
- `test_exit_code_is_one_when_any_surah_is_refused_and_the_others_are_still_written`
- `test_optional_input_keys_are_ignored` (extra `repairs`, `manual_marks`, `snapped`, `confidence`)

## Gates

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /Applications/MAMP/htdocs/quran-app/tools/recitation-align
uv run pytest -q
```

Then a dry check on real local data (do not commit the output): convert one surah to a scratch folder you create with `mktemp -d` and print the first two `ayahs` entries' numeric fields only (no Arabic):

```bash
uv run python -m recitation_align.export --kind mp3quran --recitation-key 253 --in out/253-v7 --surah 59 \
  --out "$(mktemp -d)"
```

It must write `059.json` with 24 ayahs, `verse_id` 5127 for the first, last `end_ms` 541936.

## Out of scope

The PHP importer and word-count check (step 02b); a confidence floor (plan A6); MP3Quran published-timing normaliser (B6); running the aligner; committing generated files; editing `cli.py` or `pyproject.toml`.

## Open questions

None.

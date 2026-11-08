# Way2Quran quality mode: completeness, ASR anchors, repeat-aware alignment, the gate and release

Status: **accepted by the developer, 7 Nov 2026** (ADR 0077). Q0–Q13 proceed on it · Branch: `main`, as for `docs/plans/way2quran-reciter.md`. The tree is shared with Phase 7 work, so each step stages only its own files and records its base commit (`git rev-parse HEAD`) in its brief · ADR: `docs/adr/0077-way2quran-quality-mode.md` · Supersedes steps 10 and 11 of `docs/plans/way2quran-reciter.md`.

## Rests on

- **ADRs:**
  - 0077 (this design);
  - 0074 (Way2Quran on R2; decisions 8 and 11 amended by 0077);
  - `0060-taybah-generated-recitation-timings.md` (Taybah timings, decision 8 `segments` null and no file, decision 9 the gate; its "no surah-by-surah shipping" rule is reinterpreted in 0077);
  - 0061 (partial-recording rule, copy once);
  - 0062 (unavailable-surah rows);
  - 0052 (no audio analysis on the server).
  - 0010 and the frontend rule are not touched: no UI change, unless step Q8d runs.
- **Spec:**
  - §7, line 458 (Way2Quran import; edited for exclusions);
  - §12, lines 678 and 686 (hosts, hidden until released, timings must match the audio; line 678 edited for the release PR);
  - §14 (CI pipelines; edited for `tools.yml`).
  - Only in the conditional format 2 steps: §5 lines 308–311 (`taybah_timing_sets`, timing kinds) and §6 (device schema).
- **Content plan:** no new dependency. `rapidfuzz`, `torch`, `transformers` and `numpy` are already in `tools/recitation-align/pyproject.toml`, and the two models are exempt under ADR 0060 (consequences).
- **Code read for this plan:**
  - `.github/workflows/add-reciter.yml`;
  - `tools/recitation-align/scripts/pilot_published.py` (`run_surah`, whose `run_aligner` sorts words by `(ayah, position)`; `write_surah`, which writes `tool_version` from `recitation_align.__version__` = `0.1.0`);
  - `recitation_align/transcribe.py` (`transcribe`, `transcription_key`, `cached_transcribe`; `CHUNK_SECONDS` 30, `MAX_NEW_TOKENS` 220);
  - `recitation_align/export.py` (`build_surah` takes an ayah's start from its first word in list order; `map_segments` writes segments in recited order; `FORMAT = 1`);
  - `recitation_align/ci.py` (`MAX_CHUNKS = 20`, `check_aligned`, `quality_summary`, `plan_way2quran`);
  - `recitation_align/models.py` (`ASR_REVISION`);
  - `tools/mp3quran-ingest/mp3quran_ingest/way2quran.py` (`RECITER_KEYS` checked by strict equality at line 113) and `cli.py` (an empty `--surah` list means every listed surah, lines 88–89; dry downloads go to `out/audio/<source>-ID`, line 93; `--source-dir`);
  - `apps/api/app/Domains/Content/Services/TaybahTimingImporter.php` (`validSegments`, line 301) and `Timings/TaybahTimingFileReader.php` (`FORMAT` check at line 38; null `segments` accepted at line 112);
  - `apps/api/config/quran.php:130` (`way2quran_released_reciters`).
- **Evidence:** the ADR 0077 numbers. The design notes and logs were kept in the session scratchpad and are not in the repo. Where a step needs an algorithm, its text in this plan is the specification.

## Decisions that need the developer

These are acceptances to give, not questions. They block **only Q13** (release); Q0–Q12 do not wait for them.

1. **Accept the change to ADR 0074 decision 8.** That decision said the developer adds the release line. ADR 0077 has the coordinator open a one-line release PR, guarded by `test_released_gated.py`.
2. **Accept the `CLAUDE.md` exception.** `CLAUDE.md` says "The developer commits and pushes". ADR 0077 proposes release PRs opened by the coordinator as an exception for Way2Quran releases. The workflow bot already pushes reciter branches, and step briefs never commit.
3. **Accept the replaced gate:** ADR 0074 decision 11 (the pause audit) is replaced by the ADR 0077 gate and release rules, and ADR 0060's "no surah-by-surah shipping" is reinterpreted for Way2Quran. These are developer-owned decisions, and the new rules are stricter.

Recorded, and needing no answer (the developer may reverse any of them):

4. **The listening spot check is removed** (it was step 11 of the old plan, and release rule R5 in the gate design). Reasons: the developer is never a step, and listening is not ground truth (ADR 0060 decision 9). G3 checks every ayah start instead.
5. **Format 2** is conditional (steps Q8a–Q8d). It needs an additive table and possibly a pack schema bump. Neither is destructive to stored data. Old clients are handled in Q8c.
6. **Licensing:** no QF data is committed. The A6(a) and repeat calibrations run locally against the gitignored `tools/recitation-align/out/a6/ref/`. Only metrics are committed.
7. **Religious interpretation:** none. Quran text is read only from the Tanzil file, at runtime. Fixtures use placeholder tokens (`w1`, `w2`, …) or read Tanzil at runtime, and no test or report prints Quran text.
8. **Navigation:** none.

## Decisions added by the planner (decisions.md was silent; the safer or more accurate option was chosen)

| # | Decision | Reason |
| --- | --- | --- |
| P1 | **Upload last.** The chunk runs dry ingest, then completeness, then alignment and the gate on the dry manifest, then the upload of surahs whose verdict is not `unavailable`. | A middle gap is found only after alignment. Uploading last means no `unavailable` file ever reaches R2. |
| P2 | The `chunks` input's default becomes `""`. `ci_plan` maps it to 6 for MP3Quran and 20 for Way2Quran. | One shared input cannot hold per-source defaults. A golden test proves that the MP3Quran plan is identical for `""` and `"6"`. |
| P3 | No `override: include` for excluded surahs. | No reviewer exists to sign one. A changed source file is re-checked by the next run. |
| P4 | The caps are: `no_highlight` ≤ ⌊1% × available surahs⌋ and ≤ 1% of available ayahs; `segments_null` ≤ 2% of available ayahs; `unavailable` ≤ 10% of listed surahs. | These are the critiques' converged numbers. The floor makes the cap 0 for Ebadi's 54 surahs. |
| P5 | `tool_version` is `0.1.0+<QUALITY_VERSION>` in quality mode only, plus a `params_digest`. A6(a) is tied to both. | MP3Quran bytes stay the same, and a released report can be traced to calibrated parameters. |
| P6 | Until format 2 ships, a cross-ayah back-jump makes ayahs n−1 and n `segments_null`, with n's start at the pass that continues into n. R7 holds the reciter. | No highlight shows a word that is not being recited. |
| P7 | G5 is `n/a` below 20 held-out words. A G5 failure that persists after repair gives `no_highlight`. | Short surahs have too few windows for G5 to be meaningful. |
| P8 | `tools.yml` lands first (Q0), so every later step's PR runs both suites and the workflow guard. A PR label `mp3quran-workflow-change` skips only the guard job. | Value lands early, and nothing merges unverified. |
| P9 | A calibration mode (`calibrate` input: dry ingest, no upload, no PR). Rule: a projected chunk time above 240 min moves `ASR_EVERY` from 4 to 6. G3 density is never reduced. | CI speed is measured before any reciter run, and the response is fixed in advance. |
| P10 | G3 clip batching is used only if a local comparison gives identical verdicts on every probe. | Batched decoding may change text. |
| P11 | Head and tail windows are sound-trimmed, and B's grid window 0 is replaced by the head window. | Whisper invents text on silence, and the change avoids transcribing the same audio twice. |
| P12 | In quality mode a refused surah does not fail the chunk. It becomes a gate verdict (G1). Tool errors still fail. | A refusal is a verdict, not a crash. |
| P13 | Gated export lives in a new module, `recitation_align/gated_export.py`. `export.py` stays unchanged until Q8a. | B1 stays checkable as "no diff". |
| P14 | If the repeat calibration misses its targets, `REPEAT_MODE = "null"`: repeat regions become `segments_null` instead of repeated positions. | An uncalibrated repeat highlight does not ship. |
| P15 | The run order is reciter 2 (first run), then 3 (fresh), then 1 (fresh). | 2 is the smallest. 1 repeats the most, and its report decides R7. |
| P16 | T4 has one listed exception: the shared plan step may gain the `QUALITY` and `CALIBRATE` env keys. | `ci_plan` needs them. Golden plan output proves MP3Quran is unchanged. |
| P17 | Every quality document, report and calibration record carries `code_digest` (sha256 over the quality-path sources: `recitation_align/{quality,completeness,checkpoints,gate,repeats,report,gated_export,transcribe,align,snap,export}.py` and `scripts/{pilot_published,w2q_completeness,w2q_gate}.py`). The guard requires it to equal the A6(a) record's. | A code fix after the calibration would otherwise ship under an A6(a) record that no longer describes the code. |
| P18 | `test_released_gated.py` compares against `RELEASE_BASE_REF`, which defaults to `HEAD`. | Finalize runs the whole suite on the default-branch checkout, MP3Quran finalize included, so the test must pass there without an env var. `tools.yml` sets the PR base sha, because a PR checkout's `HEAD` is the merge commit. A re-run of an already-released reciter whose new report fails the guard fails finalize: that is safe, and the release is withdrawn first. |
| P19 | The T2 and B3 goldens are model-free. `Wav2Vec2Processor.from_pretrained` is patched to a stub that returns a committed `tests/golden/vocab.json` (the pinned revision's tokenizer vocabulary, extracted once). | Finalize has no HF cache step, so MP3Quran finalize gains no network fetch. |

## Regression list (every step runs all of it; checks that do not exist yet are built by Q0, Q5, Q6 and Q9)

`<base>` is the step's recorded base commit. `$S` is the session scratchpad. Python runs as `cd tools/recitation-align && PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH HF_HUB_OFFLINE=1 uv run …`.

**Gate checks (C):**

| # | Check | How |
| --- | --- | --- |
| T1 | Existing suites unchanged | `uv run pytest -q` in `tools/recitation-align` and in `tools/mp3quran-ingest`. No existing test is edited: `git diff <base> -- tools/recitation-align/tests tools/mp3quran-ingest/tests \| grep -E '^-[^-]'` prints nothing (only additions). |
| T2 | Golden MP3Quran runs, model-free | `uv run pytest -q tests/test_golden_mp3quran.py` (Q0). It runs the published path, the `--fallback-aligner` path and the low-confidence retry path on committed fixtures, and compares the aligned JSON, the printed lines, the exported timing file and `quality.md` byte for byte. |
| T3 | Real before/after (reviewer, local, once per step) | `git worktree add $S/base <base>`. Run `pilot_published.py` from both trees with `RECITATION_TORCH_THREADS=4` and one shared `--emissions-dir`, on moshaf 86 surahs 1, 59 and 112 and on moshaf 62 surah 17 with `--fallback-aligner`. Then `cmp` every `aligned/*.json` and the `ci_quality.py` output. |
| T4 | Workflow rule | `uv run python scripts/workflow_dump.py --check <base>` (Q0). It compares, between base and head: every job's `needs`, `if`, `strategy`, `timeout-minutes`, `permissions`, `environment` and `runs-on`; every step that is unguarded or guarded by `inputs.source == 'mp3quran'` (all keys); and the inputs. The only allowed differences: P16, the `chunks` default and description (P2), and the new inputs `quality` and `calibrate`. |
| T5 | Export defaults | `tests/test_export.py`, `tests/test_gated_export.py`. With no new flag, today's output (golden). An aligned document carrying an `anchors`, `gate` or `repairs` key exports byte-identically through `export.main`. A repeated position exports format 1 in recited order. |
| T6 | `check_aligned` default | `tests/test_ci.py`: without the quality path, a missing surah still raises "aligned output missing … refusing a partial reciter". |
| T7 | Shipped reciters untouched | `git diff <base> --stat -- apps/api/resources/recitation-timings/mp3quran apps/api/resources/mp3quran` is empty. `git diff <base> -- apps/api/config/quran.php` is empty (release PRs may change only the `way2quran_released_reciters` line). No QF data is touched. |
| T8 | API and app unchanged | The step's staged file list has nothing under `apps/api/app`, `apps/api/database`, `apps/mobile` or `packages` (except Q8b–Q8d, and the test-only addition in Q6b). Where `apps/api` is touched: `composer qa`, then `npm run generate -w @quran/api-contract` and `git diff --exit-code packages/api-contract`. Where `apps/mobile` is touched: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`. |
| T9 | Gate units | `tests/test_gate_probes.py`, `tests/test_gate_verdicts.py`, `tests/test_repeats.py` (from Q5, Q6 and Q7 on). |
| T10 | Release guard | `tests/test_release_guard.py`, `tests/test_released_gated.py` (from Q9 on). |

**Anchor checks (B):**

| # | Check | How |
| --- | --- | --- |
| B1 | Core aligner unchanged | `git diff <base> -- tools/recitation-align/recitation_align/{align,anchors,repair,snap}.py` is empty. `export.py` is empty too, until Q8a, which may only add a writer that runs when a surah has revisits. `transcribe.py` gains additions only (B2 proves it). |
| B2 | `transcribe()` golden | `tests/test_transcribe_golden.py` (Q0): with a fake model, `transcribe()` chunks and `transcription_key()` equal the committed golden. |
| B3 | No quality flag, no change | `tests/test_golden_way2quran.py` (Q0): an aligner-only Way2Quran fixture run is byte-identical, and a mock asserts that `transcribe`, `cached_transcribe`, `transcribe_at` and `transcribe_clips` are never called. |
| B4 | Anchoring changes nothing where today's aligner works | Reviewer, local, from Q4 on: `uv run python scripts/anchor_check.py` on MP3Quran 62 surah 17 (through a local way2quran-kind manifest) and on reciter 3 surah 15. It must report 111/111 and 99/99 ayah starts and 1562/657 word starts equal to the millisecond. |
| B5 | Flags only in Way2Quran steps | `uv run python scripts/workflow_dump.py --guards`. Every occurrence of `--quality`, `--calibrate`, `hf-asr-`, `w2q_` and `way2quran-exclude` lies in a step whose `if` contains `inputs.source == 'way2quran'`. |

A step is not done until T1–T10 and B1–B5 (those that exist) pass and the reviewer's T3 and B4 results are written in the step's review note. Counts only.

## Gates (the thresholds live in `recitation_align/quality.py` `PARAMS`; changing any one bumps `QUALITY_VERSION`)

| Gate | Rule (ADR 0077 §5) | `PARAMS` names |
| --- | --- | --- |
| G0 | Completeness verdict `complete` | `KEY_PASS=80`, `KEY_UNIQUE=75`, `KEY_WORDS=(6..24 step 2)`, `HEAD_CAP_S=120`, `TAIL_CAP_S=300`, `SOUND_DB=-40`, `DURATION_FLAG=0.7` |
| Middle gap | Pace break AND ≥ 3 consecutive G3 failures ⇒ `unavailable` | `PACE_BREAK=(0.5, 2.0)`, `ADJ_JUMP=2.0`, `GAP_G3_RUN=3` |
| Anchors | Fail-safe: `complete` + ≥ 1 checkpoint per 600 s + no unresolved pace break | `ASR_EVERY=4`, `CUT_SPACING_S=240`, `SCORE_NEAR=72`, `SCORE_FAR=85`, `BACK_WORDS=3`, `PACE=(0.3, 3.5)`, `EDGE_WORDS=2`, `EDGE_S=1.5`, `MIN_CONF=0.55`, `CUT_BACK_FRAMES=2`, `MIN_CP_PER_S=1/600` |
| G1 | No refusal; `export.build_surah` succeeds | — |
| G2 | Last ayah and last word start probes OK; tail ≤ 60 s or ≤ completeness's `trailing_s` | `TAIL_MAX_S=60` |
| G3 | Every ayah 2..N; strict OK rule; one re-probe; refrain rule; probes moved 3 s away from cuts | `G3_PRE_S=0.3`, `G3_POST_S=4.5`, `G3_SCORE=75`, `G3_REPROBE=(0.0, 0.6)`, `G3_NEXT_WORDS=8`, `G3_CUT_AVOID_S=3` |
| G4 | Screen only: k = max(20, words/40), seeded by sha256 | `G4_MIN=20`, `G4_PER=40`, `G4_PRE_S=0.1`, `G4_POST_S=1.6` |
| G5 | Held-out word starts outside repeats: ≥ 97% within 0.3 s, median ≤ 50 ms; `n/a` below 20 | `G5_SHARE=0.97`, `G5_TOL_MS=300`, `G5_MEDIAN_MS=50`, `G5_MIN_N=20` |
| G6 | Mean confidence per ayah ≥ 0.4, else `segments_null`; more than 10% nulled ⇒ `no_highlight` | `FLOOR=0.4`, `NULL_SHARE=0.10` |
| Stretch | A non-final word longer than 4× (letters × pace) and longer than 2.5 s triggers repair | `STRETCH_X=4.0`, `STRETCH_S=2.5` |
| Repair | Dense ASR, back-jump DP, CTC margin, re-align; accepted only if the region passes G3, G5 and stretch | `DENSE_WIN_S=10`, `DENSE_HOP_S=5`, `BACK_PENALTY`, `CTC_MARGIN=0.02`, `STEP_PROBE_S=0.5`, `STEP_SCORE=85`, `REPEAT_MODE=("positions"\|"null")` |
| Release | R1–R7 (ADR 0077 §6) | `CAP_NO_HIGHLIGHT=0.01`, `CAP_SEG_NULL=0.02`, `CAP_UNAVAILABLE=0.10` |

## Data and report formats

These are all JSON, UTF-8, with sorted keys where written by tools. No Quran text appears in any committed file: only verse keys (`"84:9"` = ayah 84, word index 9), numbers and model ids.

**ASR cache** (artifact only): `out/way2quran/{id}/asr/NNN.json`

```json
{"key": "<sha256>|tarteel-ai/whisper-base-ar-quran@<ASR_REVISION>|30|220|win=30|at",
 "windows": {"0-30000": "<asr text>", "120000-150000": "<asr text>"},
 "dense": {"2880000-2890000": "<asr text>"}, "seconds": 412.7}
```

**Completeness record** (artifact): `out/way2quran/{id}/completeness/NNN.json`

```json
{"schema": 1, "surah": 16, "file": "016.mp3", "sha256": "…", "bytes": 19983169, "duration_ms": 1248000,
 "source_last_modified": "…", "first_sound_s": 0.4, "last_sound_s": 1247.1,
 "opening": {"words": 6, "scores": [51.1, 53.1, 53.1, 53.1], "heard": false, "at_s": null,
             "letters_key_words": null,
             "probe": {"windows": [[0.4, 16.4], [7.4, 23.4], [14.4, 30.4]], "score": 37.5, "heard": false}},
 "ending": {"words": 6, "scores": [52.6, 58.1], "heard": false, "at_s": null,
            "probe": {"windows": [[1217.1, 1233.1], [1224.1, 1240.1], [1231.1, 1247.1]], "score": 44.7, "heard": false}},
 "first_heard_ayah": 53, "last_heard_ayah": 119, "ayah_count": 128, "ending_at_s": null, "trailing_s": null,
 "windows": {"head": 4, "tail": 10}, "asr_calls_extra": 12, "ms_per_letter": 160,
 "verdict": "incomplete-both", "check": "completeness-2|tarteel-ai/whisper-base-ar-quran@5c3c53f",
 "tool_version": "0.1.0+q1", "seconds": 61.2}
```

`probe` is null when not run: when the first 30 s head or tail window scores below 90, three overlapping 16 s windows over 30 s are transcribed (the head probe adds up to 3 windows starting at pauses in the opening). A key's score is the lowest of partial match, in-order coverage of the key (LCS) and reaching the key's outer edge, so a fragment can never pass. Each key also has a long form (twice the words), and surahs whose ayah 1 is only disjoined letters get an extra opening key after them (`letters_key_words`). The probes were added (Q2b, because the ASR stops at 220 tokens and a dense 30 s window loses its last seconds). `verdict` is one of `complete`, `incomplete-start`, `incomplete-end`, `incomplete-both`, `incomplete-middle` and `unverified`. The `suspect-duration` flag is added at report merge, because it needs the reciter's median.

**Anchors report**: key `anchors` inside `aligned/NNN.json`. It is written only with `--quality`, and the export ignores it.

```json
{"asr_model": "…", "asr_revision": "…", "every": 4, "windows": 33, "located": 30, "repeats": 3,
 "checkpoints": [[52, 120345]], "cuts": [[24, 60010]], "merges": [],
 "held_out": [[61, 1834560, 1834560]], "held_out_words": {"n": 1813, "within_300ms": 1789, "median_ms": 0},
 "pace_breaks": [], "repeat_candidates": [{"from": "5:30", "to": "5:32", "why": ["stretch", "step-back"]}],
 "last_located_ayah": 120, "insufficient": null, "seconds": {"asr": 0, "locate": 1.2, "align": 2.3}}
```

**Refusal record** (artifact): `out/way2quran/{id}/refused/NNN.json`. Its shape is `{"schema": 1, "surah": 5, "stage": "anchors|aligner", "reason": "…"}`.

**Gate record** (artifact): `out/way2quran/{id}/gate/NNN.json`

```json
{"schema": 1, "surah": 5, "sha256": "…", "tool_version": "0.1.0+q1", "verdict": "repaired", "reasons": [],
 "checks": {"G0": "complete", "G1": "ok", "G2": {"last_ayah": "OK", "last_word": "OK", "tail_s": 7.9},
   "G3": {"n": 119, "ok": 119, "bad": 0, "unsure": 0, "failed": []},
   "G4": {"n": 60, "exact": 52, "pm1": 7, "bad": 1, "triggered": []},
   "G5": {"n": 1718, "share_300ms": 0.986, "median_ms": 0, "status": "pass"},
   "G6": {"low_conf_ayahs": []}, "stretch": {"words": [["5:31", 1, 8600]]},
   "pause": {"pauses": 0, "density": 0.0, "share_07": null}},
 "repairs": [{"region": ["5:30", "5:32"], "trigger": ["stretch", "G3"], "kind": "within-ayah",
   "ctc_margin": 0.041, "before_start_ms": 1078000, "after_start_ms": 1086100, "accepted": true}],
 "segments_null": [], "cross_ayah": [], "probes": [["5:85", "84:9", "BAD", 83]],
 "seconds": {"g3": 290.4, "g4": 61.0, "repair": 22.5}}
```

**Reciter report** (committed): `tools/recitation-align/checks/way2quran-{id}.json`

```json
{"schema": 1, "source": "way2quran", "reciter_id": 3, "run_id": "…", "quality_mode": true,
 "tool_version": "0.1.0+q1", "params_digest": "…16 hex…", "code_digest": "…16 hex…",
 "models": {"align": "jonatasgrosman/wav2vec2-large-xlsr-53-arabic@af46c2d", "asr": "tarteel-ai/whisper-base-ar-quran@5c3c53f"},
 "a6a": null,
 "release": {"releasable": false, "rules_failed": ["R5"], "listed_surahs": 114, "available_surahs": 111,
   "available_ayahs": 6000, "pass": 100, "repaired": 10, "no_highlight": 1, "no_highlight_ayahs": 12,
   "segments_null_ayahs": 30, "unavailable": 3, "cross_ayah_unrepresented": 0},
 "surahs": {"16": {"sha256": "…", "verdict": "unavailable", "reason": "incomplete-both", "flags": ["suspect-duration"],
                   "completeness": {"…": "the completeness record minus seconds"}, "gate": null},
            "15": {"sha256": "…", "verdict": "pass", "reason": null, "flags": [],
                   "completeness": {"…": "…"}, "gate": {"…": "the gate record minus probes and seconds"}}}}
```

**Exclusions** (committed): an optional key in `way2quran_reciters.json`. When it is absent, the file is byte-identical to today's.

```json
"excluded": {"16": {"file": "016.mp3", "sha256": "…", "bytes": 19983169, "source_last_modified": "…",
  "reason": "incomplete-both", "first_heard_ayah": 53, "last_heard_ayah": 119, "ayah_count": 128,
  "check": "completeness-1|…", "run_id": "…"}}
```

`reason` is one of `incomplete-start`, `incomplete-end`, `incomplete-both`, `incomplete-middle` and `unverified`.

**Calibration records** (committed, metrics only):
- `tools/recitation-align/checks/a6a-afasy.json`:

  ```json
  {"schema": 1, "records": [{"tool_version": "0.1.0+q1", "params_digest": "…", "code_digest": "…", "date": "2026-11-..", "surahs": [1, 2, 18, 36, 59],
   "words_compared": 0, "word_start_ms": {"median": 0, "p90": 0, "p99": 0},
   "ayah_starts": {"n": 0, "share_300ms": 0.0, "max_ms": 0}, "g3": {"probes": 0, "false_bad": 0}, "passed": false}]}
  ```

- `checks/repeat-calibration.json`, with the same envelope; its fields are `repeat_ayahs`, `reproduced_share`, `median_ms`, `p90_ms`, `false_repeats`, `ctc_margin` and `passed`;
- `checks/ci-calibration.json`, of shape `{"schema": 1, "run_id", "tool_version", "surahs": [{"reciter", "surah", "audio_s", "seconds": {stage: s}, "rtf": {stage: x}}], "projected_chunk_min": {"1": 0, "2": 0, "3": 0}, "decision": "ASR_EVERY=4"}`;
- `checks/cross-ayah-measure.json`, of shape `{"schema": 1, "tool_version", "files": [{"source", "id", "surah", "regions", "within_ayah", "cross_ayah", "cross_keys": ["5:85"]}]}`;
- `checks/calibration-surahs.json`, which is `{"schema": 1, "reciters": {"1": [5, 9], "3": [15, 16, 18, 19, 23, 55]}}`.

**PR body (quality mode).** The first line is `Releasable: yes` or `Releasable: no (rules failed: R2, R5)`. Then a counts table by verdict (surahs, ayahs). Then "Completeness (excluded)", one row per excluded surah: `| 16 | incomplete-both | heard 53–119 | of 128 |`. Then "Gate per surah", with the columns Surah | Verdict | Reasons | G3 ok/n | G5 share | Null segs | Repairs | Pause density | Tail s. Keys and numbers only, under 60 KB.

## Steps

Each step is one reviewable, committable change. Its brief records `<base>`, runs the regression list and writes a review note with counts. On the model choice: Haiku by default (delegation rule); the steps named *stronger model* are algorithmic, and Haiku is likely to get them subtly wrong.

### Q0. Regression harness and the tools test workflow

- **Files:**
  - **New golden fixtures** under `tools/recitation-align/tests/golden/`. Each case has a fixture manifest, a stub audio file whose sha256 the manifest records, the emissions `.npz` and the pauses JSON keyed to that sha, the raw published file, and the expected `aligned/NNN.json`, `stdout.txt`, exported `timing/NNN.json` and `quality.md`. The three cases:
    - `mp3quran-86-112/`, the published path;
    - `fallback/`, a crafted raw file that `published_refusal` refuses, so `--fallback-aligner` aligns;
    - `lowconf/`, crafted spans that trip `too_many_low`, so the aligner comparison runs.

    `tests/golden/make_golden.py` (run once, locally) builds them from real emissions and extracts `tests/golden/vocab.json` from the pinned processor (P19). If surah 112 cannot reach a path, use the shortest surah that can, and say which in the brief.
  - **New tests:**
    - `tests/test_golden_mp3quran.py` (T2). It runs `pilot_published.main([...])` with `load_wav16k` patched to return zeros of the right length and `Wav2Vec2Processor.from_pretrained` patched to the vocab stub (P19), then `export.main` and `ci.quality_summary`, and compares bytes. No model, no network.
    - `tests/test_golden_way2quran.py` (B3).
    - `tests/test_transcribe_golden.py` (B2).
    - `tests/test_ci_plan_golden.py` (plan output for both sources, with a fake `Api`).
    - `tools/mp3quran-ingest/tests/test_way2quran_roundtrip.py` (the committed `way2quran_reciters.json` re-serialises byte-identically through `parse_document` and `to_document`).
  - **New `tools/recitation-align/scripts/workflow_dump.py`,** with `--check <ref>` (T4) and `--guards` (B5). It reads YAML through PyYAML, which `transformers` already installs. No new dependency; it exits with a message if PyYAML is missing.
  - **New `.github/workflows/tools.yml`:**
    - checkout with `fetch-depth: 0`, because `--check <base sha>` and the dropped-pass check read history;
    - triggers: `pull_request` on the paths `tools/**`, `.github/workflows/add-reciter.yml`, `.github/workflows/tools.yml`, `apps/api/config/quran.php`, `apps/api/resources/way2quran/**` and `apps/api/resources/recitation-timings/**`; `permissions: contents: read`; actions pinned to the SHAs that `add-reciter.yml` uses;
    - job `recitation-align`: `uv sync --frozen`, then `actions/cache/restore` with the add-reciter `hf-…` key formula, then `uv run pytest -q`;
    - job `mp3quran-ingest`: `uv run pytest -q`;
    - job `workflow-guard`: `workflow_dump.py --check ${{ github.event.pull_request.base.sha }}` and `--guards`. It is skipped when the PR has the label `mp3quran-workflow-change`.
  - **Spec §14:** the `tools.yml` line (done in this change of documents).
- **Tests:** the files above, all passing on unchanged code. They are baselines.
- **Done:** all goldens pass on `<base>` code; `tools.yml` is green on its PR; T4 reports "identical" when run against itself.
- **Model:** Haiku (mechanical). The golden-path crafting is checked by the reviewer.

### Q1. Shared ASR windows, the quality version, report scaffolding

- **Files:**
  - **`recitation_align/transcribe.py`, additions only.** `transcribe()` and `transcription_key()` are untouched (B2).
    - `WINDOW_SECONDS = 30`.
    - `transcribe_at(wav, windows: list[tuple[float, float]]) -> dict`, returning `{"windows": [{"start_s", "end_s", "text"}]}`. It uses the same `_load`, processor call, `generate(max_new_tokens=MAX_NEW_TOKENS)` and decode as `transcribe`'s loop body, copied rather than refactored.
    - `transcription_key_at(sha)`, equal to `transcription_key(sha) + "|win=30|at"`.
    - `cached_transcribe_at(wav, sha, cache_path, windows)`. It reads and writes the ASR cache format above, transcribes only the windows that are missing, and writes atomically. A key mismatch recomputes everything.
  - **New `recitation_align/quality.py`:**
    - `QUALITY_VERSION = "q1"`;
    - `PARAMS`, holding every name in the Gates table;
    - `tool_version()`, which returns `f"{__version__}+{QUALITY_VERSION}"`;
    - `params_digest()`, the first 16 hex characters of the sha256 of the canonical JSON of `PARAMS`;
    - `code_digest()`, the first 16 hex characters of the sha256 over the P17 files, read in sorted path order.
  - **New `recitation_align/report.py`:**
    - builders and validators for the completeness, gate and reciter-report shapes;
    - `merge_reciter_report(handoff_dir, data_file_entry, run_id)`;
    - `release_rules(report) -> (releasable, rules_failed, counts)`, implementing R1–R7 and P4;
    - `pr_markdown(report) -> str`.
  - **New `scripts/w2q_report.py`:** `merge --reciter ID --handoff DIR --out PATH --run-id ID` and `markdown --report PATH --out FILE`.
- **Tests:**
  - `tests/test_quality_version.py` also covers `code_digest()`: it changes when one listed file changes, and it does not depend on the working directory.
  - `tests/test_transcribe_at.py` (fake model):
    - windows on the 30 s grid give the same texts as `transcribe()`;
    - the key differs from `transcription_key`;
    - only missing windows are computed;
    - a mismatched key recomputes.
  - `tests/test_quality_version.py`: the format, and a digest that stays stable.
  - `tests/test_report.py`:
    - a missing field is refused;
    - R2 floors: 54 surahs allow 0 `no_highlight`, 114 allow 1;
    - R3 2% and R4 10% boundaries;
    - R5 fails when `a6a` is null;
    - R7 fails when `cross_ayah_unrepresented` > 0;
    - the markdown has no character in U+0600–U+06FF and stays under 60 KB for 114 rows.
- **Done:** the new modules are tested; nothing calls them yet; T1–T10 and B1–B5 pass.
- **Model:** Haiku.

### Q2. The completeness check (library) and the `excluded` data key

- **Files:**
  - **New `recitation_align/completeness.py`** (transcription injected as `transcribe_windows(windows) -> list[str]`):
    - `opening_key(surah, ayahs)` and `ending_key(surah, ayahs)`: shortest unique span, `KEY_WORDS`, uniqueness below `KEY_UNIQUE` by `partial_ratio` against the rest of the surah; the basmala is stripped from ayah 1 except in surahs 1 and 9. They return normalised keys, used for matching only;
    - `sound_bounds(wav) -> (first_s, last_s)` (100 ms frame RMS above `SOUND_DB`);
    - `head_windows(first_s)` and `tail_windows(last_s)` (30 s steps, capped);
    - `heard_ayahs(text, surah, ayahs) -> (first, last)` (5-word heads and tails at score ≥ 85);
    - `ending_at(texts, windows, key)`, which turns `partial_ratio_alignment` offsets into seconds;
    - `check_file(wav, surah, ayahs, sha, bytes, transcribe_windows, *, shared_texts=None) -> record`;
    - `duration_flags(records) -> {surah: ["suspect-duration"]}`, computed against the median of `complete` files.
  - **New `scripts/w2q_completeness.py`:** `--reciter ID --manifest DRY --audio-dir DIR --surah N… --out-dir … --asr-dir …`. It writes one record per surah plus `complete-surahs.json` (a list of ints). It exits 0 when files are incomplete and non-zero only on a tool error.
  - **`tools/mp3quran-ingest/mp3quran_ingest/way2quran.py`:**
    - `RECITER_KEYS` stays the required set, and `parse_reciter` (line 113) accepts it plus an optional `excluded`;
    - the `excluded` map is validated: keys are surah numbers as strings, 1–114; `file` matches the surah's name form; no surah appears in both `files` and `excluded`; `reason` is in the set; `sha256` is 64 hex characters; `bytes` is an int;
    - `to_document` emits `excluded` only when it is non-empty, with sorted keys;
    - `write_reciter` carries exclusions forward. A listed file whose name, size and `Last-Modified` equal the excluded record stays out of `files`. Otherwise it stays in `files`, and the lister prints "surah S changed on the source; the next run checks it again".
  - **`tools/mp3quran-ingest/mp3quran_ingest/cli.py`:** new `way2quran-exclude --reciter ID --report PATH [--write]`. It moves every surah whose report verdict is `unavailable` from `files` to `excluded`, prints the change, and is idempotent. Without `--write` it is a dry run.
- **Tests:**
  - `tests/test_completeness.py`. The mocked transcriber returns normalised text cut from the Tanzil file at runtime; no Quran text is written in the test.
    - Keys: the basmala is stripped for 2 and 16 but not for 1 and 9; the keys for 55 and 77 grow past the refrain (uniqueness below 75); the key for 108 crosses ayahs; every one of the 114 opening and ending keys is unique within 24 words.
    - Verdicts and windows:
      - a complete file uses 0 extra calls when the shared head and tail texts already match;
      - an ending heard only in tail window 4 is `complete`;
      - a file holding 16:53–16:119 gives `incomplete-both`, with first 53 and last 119;
      - a missing opening gives `incomplete-start`, and no surah text heard gives `unverified`;
      - synthetic silence plus a tone is trimmed;
      - the caps hold: ≤ 4 head and ≤ 10 tail calls.
    - Robustness: ASR noise (2 letters changed per word) still passes; `suspect-duration` fires below 0.7× and never excludes.
  - `tools/mp3quran-ingest/tests/test_way2quran_excluded.py`:
    - round trip;
    - overlap refused, bad reason refused;
    - a document without `excluded` is byte-identical (the Q0 golden);
    - the lister carries exclusions forward, and a changed source is re-listed with the message;
    - `way2quran-exclude` moves only `unavailable` surahs and is idempotent.
- **Real check (reviewer, local):** reciter 3's 016, 019 and 023 are excluded with the heard ranges of ADR 0077; 018 and reciter 1's 005 and 009 are `complete`. Record the scores and the margin against PASS 80.
- **Done:** the tests pass; the real check reproduces the +13.3 / −21.9 margins within ±3 points.
- **Model:** a *stronger model* (Sonnet) for `completeness.py`; Haiku for the ingest parts.

### Q3. Completeness in CI: the `quality` input, the Whisper cache, upload last, finalize

**Files: `.github/workflows/add-reciter.yml`.** Only steps guarded by `inputs.source == 'way2quran'` change, apart from the P16 env keys in the plan step.

- **Inputs:**
  - `quality`: boolean, default `false`, described "Way2Quran only: completeness, anchors, repeats and gate (ADR 0077)";
  - `chunks`: the default becomes `""`, described "empty: 6 for mp3quran, 20 for way2quran" (P2).
- **Plan step:** gains `QUALITY: ${{ inputs.source == 'way2quran' && inputs.quality }}`, and passes `--quality` to `ci_plan.py` when it is true.
- **Align job.** The existing Way2Quran ingest, align and stage steps gain `&& !inputs.quality`. New steps, each guarded `inputs.source == 'way2quran' && inputs.quality`:
  1. **Whisper cache:** `actions/cache` on `~/.cache/huggingface/hub/models--tarteel-ai--whisper-base-ar-quran`, keyed `hf-asr-${{ runner.os }}-<ASR_REVISION>`. The revision is read from `models.py` by a step. It runs after the existing `hf-…` cache step.
  2. **Dry ingest:** `mp3quran-ingest ingest --source way2quran --reciter R --surah… --manifest out/dry-manifest-R-C.json`. Downloads go to `out/audio/way2quran-R`.
  3. **Completeness:** `w2q_completeness.py`.
  4. **Align:** `pilot_published.py --source-kind way2quran --aligner-only --quality --completeness-dir … --manifest out/dry-manifest-R-C.json --surah <complete…>`. Skipped in shell, with a message, when the list is empty.
  5. **Upload:** `ingest --upload --via s3 --source-dir out/audio/way2quran-R --surah <not unavailable…> --manifest out/manifest-R-C.json`. It is skipped in shell when the list is empty, because an empty `--surah` list means every surah (`cli.py:88–89`). Then `scripts/w2q_verify_upload.py` fails the chunk unless each uploaded entry's `sha256`, `bytes` and `key` equal the dry entry's.
  6. **Stage:**
     - `mkdir -p handoff/{aligned,completeness,asr,gate,refused}` under `shopt -s nullglob`;
     - copy the upload manifest only if it exists, and always copy the dry manifest;
     - always write `handoff/chunk.json` = `{"reciter", "chunk", "surahs", "complete", "uploaded"}`, so the artifact is never empty (`if-no-files-found: error` stays).
  7. The upload-artifact step is unchanged (same names).
- **Finalize.** The existing Way2Quran merge, export, quality and PR steps gain `&& !inputs.quality`. New guarded steps:
  1. `w2q_report.py merge`, writing `tools/recitation-align/checks/way2quran-R.json`.
  2. `mp3quran-ingest way2quran-exclude --reciter R --report … --write`.
  3. `ci_merge_manifest.py --source way2quran` over the upload parts only. It reads the reduced `files`.
  4. Export. In Q3 this is today's `export --kind way2quran` over the available surahs; Q6b replaces it with gated export.
  5. `w2q_report.py markdown`.
  6. Commit and PR: `git add` the manifest, the timings dir (only if it exists), `tools/mp3quran-ingest/mp3quran_ingest/way2quran_reciters.json` and `tools/recitation-align/checks/way2quran-R.json`. The body starts with the Releasable line; the title is "Reciter: Way2Quran reciter R (quality)".

**Files: tools.**

- `recitation_align/ci.py`: `DEFAULT_CHUNKS = {"mp3quran": 6, "way2quran": 20}`, and `parse_chunks` accepts `""` given a source.
- `scripts/ci_plan.py`: `--quality`.
- `scripts/pilot_published.py`:
  - `--quality` and `--completeness-dir` are refused unless `--source-kind way2quran --aligner-only`;
  - a surah whose record is missing, not `complete`, or of another sha256 is refused;
  - quality documents carry `quality.tool_version()`;
  - quality-mode refusals write `refused/NNN.json` and exit 0 (P12).
- New `scripts/w2q_verify_upload.py`.

**Tests:**

- `tests/test_ci_way2quran.py` (new functions): `""` gives 6 for mp3quran, with a plan identical to `"6"` (golden); `""` gives 20 for way2quran.
- `tests/test_aligner_only.py` (new functions):
  - `--quality` is refused for mp3quran and without `--aligner-only`;
  - a non-complete record or a sha mismatch is refused;
  - the quality `tool_version` is `0.1.0+q1`;
  - without `--quality`, the run is byte-identical (B3).
- New `tests/test_w2q_handoff.py`:
  - a chunk with every surah excluded stages completeness, the dry manifest and `chunk.json`, with no aligned docs and no upload part;
  - the report merge handles chunks with no upload part;
  - exclude, then merge, accepts the reduced list;
  - `w2q_verify_upload.py` refuses a key mismatch.
- T4 (with the P16 exception) and B5.

**Done:** the tests and the guard pass. No reciter is dispatched here: the first dispatch is Q10, so nothing unverified is merged.

**Model:** Haiku, with the exact step text in its brief. The reviewer runs T4 and B5 and reads the YAML diff line by line.

### Q4. ASR anchors (segmented alignment)

- **Files:**
  - **New `recitation_align/checkpoints.py`:**
    - `schedule(duration_s, head_windows, tail_windows, every)`;
    - `locate_chunks(windows, keys, pace)`, returning ok, far or repeat per window: forward region = 2 × pace × elapsed time (at least 800 characters) at `SCORE_NEAR`, whole-surah fallback at `SCORE_FAR`, step-back more than `BACK_WORDS` = repeat;
    - `chain(located, pace)` (longest non-decreasing chain plus the pace filter);
    - `local_checkpoints(em, located, tokens, …)` (local CTC inside the window ±`EDGE_S`, with leading and trailing stars, edge rules and `MIN_CONF`; `anchors.usable_ayahs` excludes refrains);
    - `pick_cuts(cps, spacing)`;
    - `align_cut(em, tokens, …, cuts) -> (words, cuts_used, merges)`: segment 0 has a leading star, every segment has a trailing star, and a failing segment merges with its neighbour and is logged;
    - `pace_breaks(located)` (the middle-gap input: transcribe the skipped grid windows, then the adjacent-jump test);
    - `anchored_align(...) -> (words, recited, report)`.

    It reuses, unchanged, `align.surah_tokens`, `decide_basmala`, `align_emissions` and `basmala_word_count`.
  - **`scripts/pilot_published.py`, quality branch:**
    - the windows come through `cached_transcribe_at`, with the completeness head and tail windows reused from `asr/NNN.json`;
    - `run_aligner` calls `anchored_align`;
    - the fail-safe writes `refused/NNN.json` with stage `anchors`;
    - the `anchors` key is written;
    - `snap_to_pauses` runs as today.
  - **New `scripts/anchor_check.py`** (B4).
- **Tests:**
  - New `tests/test_checkpoints.py`:
    - windows are located in order; a backward step is a repeat and keeps the cursor; unmatched windows are skipped;
    - the whole-surah fallback needs 85;
    - the chain drops out-of-order windows and pace outliers;
    - `pick_cuts` keeps its spacing and increasing ayahs, and never cuts at ayah 1;
    - no checkpoint comes from edge words or edge seconds;
    - refrain ayahs never become checkpoints;
    - `align_cut` merges on a faked failing segment and logs it, and raises when no cut is left;
    - the fail-safe fires below 1 checkpoint per 600 s;
    - the schedule contains the head and tail windows;
    - `pace_breaks` flags a synthetic jump.

    Faked emissions and placeholder tokens only.
  - `tests/test_aligner_only.py`: with `--quality`, `cached_transcribe_at` is called and the `anchors` key is written; without it, neither happens.
  - `tests/test_export.py`: a document with `anchors` exports byte-identically.
- **Real check (reviewer, local):**
  - 005: 120/120 ayahs; 018: 110/110;
  - held-out word starts within 0.3 s: ≥ 98% for 005 and ≥ 99% for 018 (ADR 0077: 98.7% and 99.6%);
  - B4 equal on 62-017 and 015;
  - the per-surah ASR seconds are printed.
- **Done:** the tests, the real check and B4 pass.
- **Model:** *stronger model* (Opus): a CTC segmentation port with merge-on-failure.

### Q4 review decisions (coordinator, 7 Nov 2026)

- **Q2b (inserted before Q5):** completeness false exclusion found on MP3Quran 62 surah 17 (complete file, ending key
  52–59 < 80). Diagnose and fix, then measure the false-exclusion rate on a large labelled set: MP3Quran files that
  are known complete (published timings cover the last ayah), at least 60 surahs across moshafs 12, 62, 86, mixing
  short and long surahs; target 0 false exclusions, with the six known Way2Quran verdicts unchanged.
- **Held-out data for G5:** the anchors report keeps per-word held-out refs (`held_out_refs`: ayah, position,
  checkpoint ms, final ms), so Q6a can set aside repeat regions found by stretch/G3 before scoring G5.
- **Accepted:** the stand-in fixture in `test_aligner_only.py` for the two Q3 tests; the Q4 interpretations (fail-safe
  floor, pace-break statuses and mechanics, overlap drop, snapping inside `anchored_align`, refrains < 3 words).

### Q5. The G3 and G4 probe library

- **Files:**
  - **New `recitation_align/gate.py`** (transcription injected):
    - `local_text(surah, n, ayahs)`: normalised words of all of n−1, all of n and the first `G3_NEXT_WORDS` of n+1, each with its `(ayah, index)`;
    - `match_start(text, local) -> {"verdict", "heard", "score"}`: OK when the match begins at word 0 of n, or in the last word of n−1, at score ≥ `G3_SCORE`; BAD when it begins elsewhere; UNSURE when the text is empty or scores below 75;
    - `probe_ayah_starts(wav, words, surah, ayahs, transcribe_clips, cuts)`: clips, the cut-avoid rule, and a re-probe at 0.0 and 0.6 s where the worse result counts;
    - `refrain_resolve(results, usable)`;
    - `word_onset_probes(…, seed)`: the G4 screen, taking the duplicate-word occurrence nearest to w.
  - **`recitation_align/transcribe.py`, an addition:** `transcribe_clips(wav, clips, batch=1)`.
- **Tests:** `tests/test_gate_probes.py`. Local texts are cut from Tanzil at runtime.
  - Verdicts: OK at word 0; OK on the pre-roll word; BAD with heard `n-1:9`; UNSURE on empty text and on a low score; the worse re-probe counts.
  - Refrains: a synthetic two-ayah refrain shift (055:13–40) is caught by the unique neighbours.
  - Probe placement: duplicate words take the nearest occurrence; a probe within 3 s of a cut moves to the next start; the seeded sample is deterministic.
  - Batching: `batch=16` with a fake model gives the same texts as `batch=1`.
- **Real check (reviewer, local):**
  - QF Afasy 36, every ayah: 0 BAD;
  - reciter 3's 015: 98 of 98 OK;
  - anchored 005: 5:85 is BAD with heard `84:9`;
  - 019's tail (today's aligner) has 74–98 flagged.

  P10: run 015 at batch 1 and at batch 16 and adopt 16 only if all 98 verdicts are identical. Record the per-probe seconds.
- **Done:** the tests pass, and the real check reproduces "0 false alarms in 139".
- **Model:** *stronger model* (Sonnet): the matching rules are subtle.

### Q6a. Verdicts, stretch, held-out, end coverage, middle gap

- **Files:**
  - **`recitation_align/gate.py`, additions:**
    - `stretched_words(words, pace)`;
    - `held_out_stats(anchors, words)` (G5, outside repeat regions, `n/a` below 20);
    - `end_coverage(...)` (G2);
    - `low_conf_ayahs(words)` (G6, basmala excluded);
    - `middle_gap(anchors, g3)` (both signals required);
    - `surah_verdict(...) -> gate record`. In Q6a anything that needs repair gives `no_highlight` with reason `needs-repair`; Q7b replaces this.
  - **New `scripts/w2q_gate.py`:** `--reciter ID --surah… --aligned-dir --completeness-dir --refused-dir --asr-dir --out-dir`. It writes `gate/NNN.json` for every surah of the chunk, including refused ones (G1) and unavailable ones (G0).
  - **Workflow:** a guarded align-job step "Gate (Way2Quran quality)" after Align and before Upload. The Upload step then reads `gate/` for its list.
  - **`report.py`:** `merge_reciter_report` fills the gate sections.
- **Spliced-fixture experiment (local, required before the thresholds freeze):**
  - Make `018-spliced.mp3` with ffmpeg (900–1020 s removed).
  - The quality pipeline must give `unavailable` (`incomplete-middle`) on it, and `pass` or `needs-repair` on the unspliced 018.
  - If not, tune only `PACE_BREAK`, `ADJ_JUMP` and `GAP_G3_RUN`, and record the values.
- **Tests:** `tests/test_gate_verdicts.py`:
  - the G0–G6 table;
  - stretch catches a synthetic 8.6 s non-final word at confidence 0.988 (the 5:31 pattern; placeholder positions), and a 4.4 s first word at confidence 0.42 (the 5:85 pattern);
  - more than 10% nulled gives `no_highlight`;
  - G5 is `n/a` at n < 20;
  - middle gap: a pace break alone is a flag, G3 failures alone give `needs-repair`, and both give `unavailable`;
  - every record validates against `report.py`.
- **Done:** the tests pass; the spliced result is recorded; the thresholds are frozen in `PARAMS`.
- **Model:** *stronger model* (Sonnet).

### Q6a review decisions (coordinator, 7 Nov 2026)

- **Frozen:** `PACE_BREAK` upper bound 1.6 (was 2.0), `QUALITY_VERSION` q2 (spliced 018: the splice pair paced 1.93×;
  unspliced surahs peak at 1.35×). Other thresholds unchanged.
- **Anchors report:** gains `held_out_refs` = `[ayah, position, checkpoint ms, final ms]`, the exact set behind
  `held_out_words`.
- **Safety rule for Q7b:** a run of ≥ `GAP_G3_RUN` consecutive G3 failures that repair cannot fix makes the surah
  `unavailable` (reason `incomplete-middle`), never `no_highlight`, so audio with a hole is never shipped. A pace
  break alone stays a flag.
- **Evidence the gate is strict enough:** 015 pass; 005, 018 and MP3Quran 62:017 need repair (017 also has a mistimed
  last word in today's live timings); spliced 018 unavailable.

### Q6b. Gated export and the finalize wiring

- **Files:**
  - **New `recitation_align/gated_export.py`** (`python -m recitation_align.gated_export --kind way2quran --recitation-key R --in aligned --gate-dir gate --out … --source aligner`):
    - for each `pass` or `repaired` surah, it calls `export.build_surah` and sets `segments` to null for the listed `segments_null` ayahs;
    - it writes through the export's own writer functions;
    - it writes no file for `no_highlight` or `unavailable`;
    - it refuses a `pass` without an aligned document.

    `export.py` is unchanged (P13).
  - **Finalize:** the Q3 export step uses `gated_export`, and the report's release section is now computed. R5 fails until Q11, so nothing is releasable before then, by design.
  - **API, test only:** `apps/api/tests/Feature/Content/TaybahTimingImportTest.php` gains a new case, only if no existing case covers it: a `way2quran` file with `"segments": null` on one ayah imports that ayah's timing with null segments. The reader already allows it (`TaybahTimingFileReader.php:112`).
- **Tests:**
  - New `tests/test_gated_export.py`:
    - with no nulls, the output is byte-identical to `export.main` for the same document (T5);
    - a `segments_null` ayah has `"segments": null`;
    - `no_highlight` and `unavailable` surahs get no file.
  - `tests/test_report.py`: a timing file without `pass` fails R6; a missing gate file fails R1.
  - `composer qa` for the Pest addition.
- **Done:** the tests pass, and so do T8 (only `apps/api/tests` touched) and the contract check (no diff).
- **Model:** Haiku.

### Q7a. Repeat detection and the recited sequence

- **Files:** new `recitation_align/repeats.py`:
  - `detect(words, anchors, gate, pace) -> [Region]`. The triggers are stretch, a step-back window or a word-surplus window (more than 1.25×), and G3 BAD or UNSURE. A region runs from the start of n−1 to the end of n+1, and overlapping regions merge.
  - `dense_windows(region)` (10 s windows, 5 s hop).
  - `recited_sequence(asr_words, region_words, back_penalty) -> [word_index, …]`: a dynamic program over match, insert, delete and a penalised back-jump to any earlier word in the region, on normalised keys.
  - `classify(seq, word_ayah) -> "within-ayah" | "cross-ayah" | "none"`.
- **Tests:** `tests/test_repeats.py`, with placeholder tokens `w1…w20` only:
  - a doubled span gives w1…w9, w1…w9;
  - a triple repeat;
  - insertion noise;
  - no back-jump on a clean sequence;
  - no spurious jump on a refrain-like duplicate;
  - cross-ayah is classified correctly;
  - the region merge;
  - each trigger fires on its synthetic case.
- **Done:** the tests pass, and the DP is O(n²) or better on a 400-word region (asserted on time).
- **Model:** *stronger model* (Opus).

### Q7b. CTC confirm, re-align, start repair, integration into the gate

- **Files:**
  - **`recitation_align/repeats.py`:**
    - `confirm_ctc(em, plain_tokens, expanded_tokens, frames) -> (accepted, margin)` (mean log-prob per frame, `CTC_MARGIN`);
    - `realign_region(em, region, expanded) -> words`: one entry per occurrence, with an `occurrence` field, through `align_emissions`. `snap_to_pauses` is then called on the region words; `snap.py` is unchanged.
  - **`recitation_align/gate.py`:** `repair_start(...)` (`STEP_PROBE_S` stepped probes until n:0 is heard at score ≥ 85, then the CTC onset of word 0) and `repair_region(...)`. A repair is accepted only if the region passes G3, G5 and stretch.
  - **`scripts/w2q_gate.py`:**
    - detection, then repair, then re-probe, then the verdict (`repaired`);
    - the repaired aligned document is rewritten with words sorted `(ayah, start_ms)` and a `repairs` key;
    - cross-ayah regions get P6 (`segments_null` for n−1 and n) and a `cross_ayah` entry;
    - with `REPEAT_MODE="null"`, every accepted region becomes `segments_null` instead.
- **Tests:**
  - `tests/test_repeats.py`: constructed log-probs make `confirm_ctc` accept expanded-favoured frames and reject plain-favoured ones at the margin; `realign_region` gives sorted occurrences, with the ayah start at the first occurrence.
  - `tests/test_gate_verdicts.py`:
    - the 5:85 pattern (n's start inside a repeat of n−1's tail) is repaired, and 5:31's too;
    - a repair whose region still fails gives `no_highlight`;
    - a late start that is not a repeat is fixed by the stepped probe;
    - a cross-ayah case gives `segments_null` with the continuing-pass start;
    - `REPEAT_MODE="null"`.
  - `tests/test_export.py`: a repaired document with a repeated position exports format 1 in recited order (T5), and its importer case already exists (`TaybahTimingImportTest.php:335`).
- **Real check (reviewer, local):**
  - Abadh 005: 5:85 is repaired, with its start within 0.3 s of the independent ASR start (about 2912 s); 5:31 lands after the second pass of 5:30 (about 1086 s); G3 is 119/119; the other ayah starts are unchanged.
  - Repeat regions and the 17:82 status are reported for 62-017.
- **Done:** the tests and the real check pass.
- **Model:** *stronger model* (Opus).

### Q7c. The repeat calibration on QF Afasy (local)

- **Run:** the repeat stage on QF Afasy 1, 2, 18, 36 and 59, against the repeat ayahs in `out/a6/ref/qf-*.json` (gitignored). If those surahs hold fewer than 50 repeat ayahs, add surahs whose QF segments the developer's local mirror already holds. They are never committed.
- **Targets:** ≥ 90% of occurrences reproduced as the same position sequence; median ≤ 60 ms and p90 ≤ 150 ms; 0 false repeats.
- **Tuning:** `CTC_MARGIN` and `BACK_PENALTY` may be tuned on this set only, with `QUALITY_VERSION` bumped. If the targets are still missed, set `REPEAT_MODE="null"` (P14).
- **Files:** `tools/recitation-align/checks/repeat-calibration.json` (metrics only) and an optional new `scripts/repeat_calibration.py`. Its test, `tests/test_repeat_calibration.py`, uses synthetic references.
- **Done:** the record is committed with `passed` true, or `REPEAT_MODE="null"` is recorded.
- **Model:** *stronger model* (Sonnet).

### Q7f. Measurement: where repeats are lost, other acoustic models, Afasy as a reciter (local, 8 Nov 2026)

Measured only; nothing shipped. QF data stayed on the Mac.

- **The CTC model is not the bottleneck.** On the 65 QF Afasy back-jump ayahs, the current wav2vec2 prefers QF's true sequence over the plain one 97% of the time, by total log-prob and by `confirm_ctc` alike. Q7c's misses came from the proposer (dense Whisper plus the DP), which never offered most repeats.
- **Other models** (scratch venvs, nothing added to the project):
  - `obadx/muaalem-model-v3_2` (MIT) ties, with about 2× the margin.
  - MMS-1b-all is no better, and `confirm_ctc`'s stars break on its emissions.
  - `TBOGamer22/wav2vec2-quran-phonetics`, `mohammed/fastconformer-quran-ar` and `rabah2026/...-quran-v_final` are unusable for this.
- **"Same word twice" in QF** (35 ayahs): CTC margins centre near zero for every model. These are probably split segments, not acoustic repeats, and the lit word is the same either way. They are scored by lit-word time against QF, not by position sequence, and both numbers are reported.
- **The pipeline on Afasy himself:** 36 passes. 2, 18 and 59 are `no_highlight`, almost all from repeats the proposer missed. Also:
  - 2:150 and 2:232 are G3 near-ties (98–99 against 100, identical openings);
  - 2:222:26 is one real misalignment;
  - 18's G5 counts repeat ayahs.
- **Al-Fatiha** is falsely `incomplete-start`: the opening key includes the basmala (ayah 1), which Whisper hears poorly. The key taken after ayah 1 scores 100.
- **Word starts are late:** ours minus QF has a median of +102 to +161 ms per surah, with fewer than 3% of words more than 50 ms early.
  - A global −110 ms shift cuts the lit-word disagreement on non-repeat ayahs from 14.3% to 8.7%.
  - The app keeps the last started word lit (`activeWordPosition`), so only starts are visible; gaps are not.
  - The old A6 gate compared ayah starts only, so this was never measured. It likely applies to every reciter we time, the live MP3Quran ones included.
- **Speed:** at q6, Abadh's surah 2 alone projects to 273–390 CI minutes against the 300-minute job timeout, because the dense-Whisper repair dominates.

### Q7g. The emission-driven repeat proposer (q7)

Prototype (`scratchpad/q7g/proposer.py`) on the Q7c set:

- a CTC Viterbi over each ayah's word graph, using the current wav2vec2 emissions;
- back-edges from the end of word j to the start of word i, for j − MAX_BACK < i ≤ j, each with a penalty;
- no stars, no ASR.

Results:

- **95% of back-jump occurrences reproduced, with 0 false repeats** on 258 control ayahs, at every penalty from 5 to 40 (MAX_BACK 8–15 identical).
- RTF 0.004 on cached emissions.
- Timing: median 120 ms (48 ms after the Q7h shift), p90 405–515 ms; the controls show the same spread.

Build steps (the gate's checks stay as they are):

- **Files:** `recitation_align/repeats.py` gains `viterbi_repeats`. `gate.repair_region` uses it in place of `ctx.dense` + `stitch_windows` + `recited_sequence`, and `confirm_jumps` scores by total log-prob without stars.
- **Kept unchanged:** `_evaluate` (G3, stretch, G5, moved neighbours), `_outcome`, the onset repair, the elongation and unresolved-repeat checks, and the safety rule.
- **Also in q7:**
  - Al-Fatiha: `completeness.LETTERS_AYAHS` gains `1: 1`, so the opening key after the basmala counts.
  - The G3 tie rule widens to a near-tie (within `G3_TIE_DELTA` of the top score, between ayahs with identical openings).
  - G5 sets aside ayahs that hold an accepted repeat.
- **Calibration:** `checks/repeat-calibration.json` is re-run at q7 with the back-jump target (≥ 90%, 0 false repeats). Same-word results are reported by lit-word time. If it passes, `REPEAT_MODE` returns to `"positions"`.
- **Speed budget:** the repair stage ≤ 0.4 RTF locally on Abadh 005 and 009.
- **Real check:** Abadh 005 and 009, Ahmed bin Talib 018, MP3Quran 62:017, 015 byte-identical, and Afasy 1, 2, 18, 36 and 59. Afasy 36 keeps 0 false alarms.
- **Model:** *stronger model* (Opus).

### Q7h. Word-start precision against QF (local)

- **Measure the late bias on more than Afasy before any shift ships.** Use 2–3 other QF reciters whose word segments the local database holds (e.g. Al-Husary, Al-Minshawi, Al-Sudais), with their QF audio, on the same five surahs. Their QF data stays on the Mac.
- **Compare boundary precision on the control ayahs:**
  - (a) the current aligner;
  - (b) the current aligner plus the measured shift;
  - (c) `obadx/muaalem-model-v3_2` forced alignment (phonetic, per word).

  Report the median, p90 and p99 of start errors, and the lit-word disagreement under the app's rule (the last started word).
- **Decision rule:**
  - If one shift holds across the reciters (each reciter's median within ±30 ms of it), it becomes `PARAMS["WORD_START_SHIFT_MS"]`, applied at export for word starts only. Ayah starts and the G3/G2 checks are untouched.
  - If muaalem's p90 is clearly better (≤ 200 ms where ours is about 400), its adoption as the word-boundary model gets its own brief.
- The live MP3Quran reciters get the shift only through Q14's verified PRs.
- **Model:** *stronger model* (Opus).

### Q8. Measure cross-ayah back-jumps, then the conditional format 2

**Measure (always).**
- Run `detect`, `recited_sequence` and `classify` locally on Abadh 005 and 009 (scratchpad audio, or re-downloaded from the `media.way2quran.com` URLs in the data file) and on MP3Quran 62 surah 17.
- Write `tools/recitation-align/checks/cross-ayah-measure.json`.
- If `cross_ayah` > 0 anywhere, Q8a–Q8d are built now, before Q9. If it is 0, they wait, and R7 still holds any reciter whose full run (Q12) finds one; Q8a–Q8d are then built before that reciter's release.
- **Model:** Sonnet (it is a run).

**Q8a–Q8d are conditional.** Each needs its own brief before code (`CLAUDE.md`: plan before touching the schema, the contract or the reader). Each runs the format 1 goldens (T5), the existing Pest and Jest suites unchanged, and the contract regeneration with no diff.

**Format 2:** identical to format 1, plus an optional top-level `revisits: [{"verse_key": "5:84", "start_ms", "end_ms", "segments": [[pos, start, end], …]}]`. Each entry is an interval inside another ayah's row during which that verse's words are recited again. The ayah rows stay contiguous and unchanged. A file is written as format 2 only when it has revisits.

| Step | Files | Tests | Model |
| --- | --- | --- | --- |
| Q8a, tools | `gated_export.py` writes format 2 for surahs with revisits; `export.py` stays unchanged, or gains only a guarded writer function (B1) | a revisits golden; every other file stays format 1, byte-identical | Haiku |
| Q8b, API | `Timings/TaybahTimingFileReader.php` (`FORMAT` 1 or 2), `TaybahTimingFile`, `TaybahTimingImporter` (revisits stored, digest covers them); an additive migration `taybah_recitation_revisits` (`recitation_id`, `chapter_id`, `verse_id`, `seq`, `start_ms`, `end_ms`, `segments` json; unique on the first four); spec §5 | Pest: format 1 tests unchanged; format 2 imports; a rerun is idempotent; the size check applies; a revisit outside the file is refused | Sonnet |
| Q8c, pack and device | `Packs/PackSchema.php` and `PackBuilder` (a revisits table in the chapter-recitations group); spec §6. **Sequencing:** `PackSchema.php` has uncommitted Phase 7 edits in the working tree on 7 Nov 2026, so this step starts only after they are committed. **Old clients:** first prove, with a test against the current mobile pack reader, that an unknown table is ignored. If it is, add the table with no version bump. If it is not, bump `PackSchema::VERSION` under spec §6's rules and record it in the brief | Pest: pack contents; old-reader compatibility | Sonnet |
| Q8d, mobile | `apps/mobile/src/features/audio/data/timings.ts` (revisits join the time-ordered search), `active-ayah.ts` (a revisit interval makes its verse and word active) | Jest: existing tests unchanged; the revisit highlight; a format 1 pack behaves as today; mobile checks | Sonnet |

**Done:** the measure record is committed, and, if needed, Q8a–Q8d are merged with their checks. R7 then counts revisits as represented.

### Q9. The release guard

- **Files:**
  - **New `recitation_align/release_guard.py`.** It holds pure checks over the committed data. It recomputes the release rules itself and never trusts the `releasable` field. The checks:
    - the report exists, with `quality_mode` true;
    - the sha256 values equal those in `apps/api/resources/way2quran/manifest.json`;
    - every `apps/api/resources/recitation-timings/way2quran/{id}/NNN.json` has a `pass` or `repaired` verdict with the same audio sha;
    - every `pass` or `repaired` surah has its file;
    - `unavailable` surahs are absent from the manifest's `surah_list` and present in `excluded`;
    - `a6a-afasy.json` has a passing record whose `tool_version`, `params_digest` and `code_digest` equal the report's (P17);
    - `cross_ayah_unrepresented` is 0;
    - no `pass` that the report at `RELEASE_BASE_REF` had has been dropped. `RELEASE_BASE_REF` defaults to `HEAD` (P18).
  - **New `tests/test_released_gated.py`.** It reads `apps/api/config/quran.php` through `ci.php_array_keys(text, "way2quran_released_reciters")` and runs the guard for each released id. With no released ids it passes. It never skips. It needs no model and no network, so it is safe inside every add-reciter finalize, which runs the whole suite unguarded.
  - **`tools.yml`:** it sets `RELEASE_BASE_REF` to the PR base sha.
- **Tests:** new `tests/test_release_guard.py`, on fixtures. Each of these fails: a missing report, a sha mismatch, a recomputed releasable false, a dropped `pass` (against a temporary git repo whose `HEAD` holds the earlier report), a missing a6a record, a version, params or code digest mismatch, a timing file without `pass`, a `pass` without a file, an unavailable surah in `surah_list`, an unrepresented cross-ayah jump. A complete fixture passes.
- **Done:** the tests pass, and `tools.yml` runs them on PRs that touch `apps/api/config/quran.php`.
- **Model:** Haiku.

### Q10. The CI calibration mode and run

- **Files:**
  - **Workflow:** a `calibrate` input (boolean, default `false`; Way2Quran plus quality only), `CALIBRATE` env in the plan step (P16), and:
    - Upload: skipped when calibrating, so nothing is written to R2;
    - finalize: every Way2Quran quality step gains `&& !inputs.calibrate`, and one step "Calibration summary" writes the job summary from the artifacts. The job's `if` is unchanged.
  - **`scripts/ci_plan.py --calibrate`:** it reads `checks/calibration-surahs.json`, makes one chunk per reciter, and refuses an id that is not in the file.
  - **The scripts' outputs** already carry `seconds`. New `scripts/w2q_calibration_check.py` asserts the known outcomes:
    - 3/016, 3/019 and 3/023 are `unavailable`;
    - 3/015 and 3/055 are `pass`;
    - 3/018 is `pass` or `repaired`;
    - 1/005 has 5:31 and 5:85 repaired;
    - 1/009 is `complete`.

    It writes `checks/ci-calibration.json`.
- **Tests:** `tests/test_ci_way2quran.py` (the calibrate plan, refusals); `tests/test_w2q_calibration_check.py` (fixtures); T4 and B5.
- **Run (coordinator):** dispatch `source=way2quran`, `moshaf_ids=1,3`, `quality=true`, `calibrate=true`.
- **Apply P9:** projected chunk minutes = (the reciter's audio / 20) × the measured total RTF + fixed overhead. Above 240 for any reciter: `ASR_EVERY=6`, bump `QUALITY_VERSION`, and re-run the calibration. G3 density is never reduced.
- **ADR 0077:** one evidence line with the measured RTFs.
- **Done:** the run passes `w2q_calibration_check.py`, `ci-calibration.json` is committed, and `QUALITY_VERSION` is frozen.
- **Model:** Haiku (files). The run is the coordinator's.

### Q11. A6(a): the Afasy word-level calibration at the frozen version (local)

- **Files** (the record carries `tool_version`, `params_digest` and `code_digest`; any later change to a P17 file means re-running this step):
  - New `scripts/a6a_quality.py`: the full quality pipeline on QF Afasy 1, 2, 18, 36 and 59, using local audio and the gitignored `out/a6/ref/qf-*.json`. It reuses the comparison code in `scripts/a6_eval.py`.
  - `checks/a6a-afasy.json`.
  - One ADR 0060 addendum (`0060-taybah-generated-recitation-timings.md`) with the numbers and the version.
- **Targets:** word starts median ≤ 60 ms, p90 ≤ 150 ms, p99 ≤ 400 ms; ayah starts 95% within 0.3 s and none beyond 1 s; G3 0 false BADs.
- **Tests:** `tests/test_a6a_quality.py` on synthetic references (metric arithmetic, record shape).
- **Done:** the record is committed with `passed` true. A failure is a work item, and nothing is released.
- **Model:** *stronger model* (Sonnet).

### Q11b. Partial surahs: play the recorded ayahs, notice for the rest (developer, 7 Nov 2026)

Developer decision: a surah whose file holds only part of it (Q2 verdicts `incomplete-start`, `incomplete-end`,
`incomplete-both`, e.g. reciter 3: 23:1–22, 19:1–76, 16:53–119) is **shipped for the recorded range** instead of
being made unavailable, when that range passes the gate. Built in the existing player style **without a new frame**
(developer approval; an approved difference under ADR 0010).

- **Tools:** Q2 reports the recorded range `[first_ayah, last_ayah]` (the head/tail keys already locate it). Align,
  anchor and gate only that range; the verdict is per surah as before, computed over the range. A range shorter than
  3 ayahs, or with a middle gap, stays `unavailable`. The report and PR table show the range.
- **Timing file and API:** the timing file lists only the recorded ayahs (format unchanged); the manifest/import
  record the range on the audio file (`first_ayah`, `last_ayah`, null = whole surah). Additive column on
  `chapter_audio_files` (migration + Pest), carried in the pack/content table (contract regenerated, mobile types).
  QF and MP3Quran rows keep null, so nothing changes for them.
- **App:** `audio/player.ts` and the reciter/ayah play paths: starting an ayah outside the range does not play;
  it shows a small notice in the existing player style («هذا الجزء غير مسجّل لهذا القارئ» / "This part isn't
  recorded for this reciter"; i18n, both languages). Playing the surah from its start begins at `first_ayah` with the
  notice shown first. Reaching the end of the range shows the notice, then continues as at a surah's end (continuous
  play moves on). The notice component is its own file with its own test (frontend rule); VoiceOver announces it.
  Tests: player unit tests for in-range, before-range, after-range, continuous play; component test; Pest for the
  importer range; a mobile check on the iPhone 17 simulator.
- **Done:** reciter 3's 23, 19 and 16 ship for their ranges after Q12 runs; the notice shows in both languages; QF and
  MP3Quran playback unchanged (existing tests + T-list).
- **Model:** Sonnet (tools + API), Sonnet (app).

### Q12. Reciter runs (2 first, then 3 and 1, fresh)

- **Order:**
  1. Dispatch `source=way2quran`, `moshaf_ids=2`, `quality=true` (chunks empty, so 20).
  2. Then 3.
  3. Then 1.
- **Rules:**
  - Never set `resume_run_id` to a pre-quality run. Finalize refuses such artifacts anyway: there are no completeness or gate files, so R1 fails.
  - A chunk that times out is resumed from the same quality run only.
- **Each PR:** read the Releasable line and the tables. Merge per the repo's practice; merging imports the reciter hidden.
- **After each merge:** a local `php artisan way2quran:import --dry-run` of the merged manifest.
- **For reciter 1:** check `cross_ayah` in the report. Any unrepresented jump means Q8a–Q8d first (R7).
- **Docs:** a runbook, `docs/runbooks/way2quran-quality-run.md` (dispatch, read the report, resume rules, the release PR).
- **Done:** three merged workflow PRs, each with a committed report.
- **Model:** the coordinator dispatches. The runbook is Haiku's.

### Q13. Release PRs (coordinator) and the exit check

- **Acceptance:** given by the developer on 7 Nov 2026.
- **For each reciter whose report says `Releasable: yes`:** one PR that adds the id to `quran.way2quran_released_reciters` and one ADR 0060 addendum line pointing at `checks/way2quran-{id}.json`.
  - Open it with a user token (`gh` as the developer's account), never `GITHUB_TOKEN`: PRs opened by `GITHUB_TOKEN` do not trigger `tools.yml`.
  - Before asking for the merge, confirm that a `tools.yml` run exists for the PR's head sha and is green, which includes `test_released_gated.py`.
- **After the deploy,** on the iPhone 17 simulator:
  - the reciter appears and streams the R2 URL;
  - one surah downloads for offline use;
  - ayah and word highlight work on three surahs, one of them `repaired`;
  - every `unavailable` surah (Ebadi's 60 unlisted ones plus any excluded) shows the ADR 0062 row, and continuous play skips them;
  - a `no_highlight` surah (if any) plays «بدون تتبع».
- **A second deploy** writes nothing.
- **Done:** the reciter is visible, and the exit check is recorded (counts and screenshots in the scratchpad).
- **Model:** the coordinator. The simulator check is Haiku's, with the reviewer comparing.

### Q14. MP3Quran report-only audit

- **Files:**
  - New `scripts/mp3quran_audit.py --moshaf N`. It maps ADR 0077's resources 38, 41 and 42 to moshafs from the manifest, and asserts the mapping instead of hard-coding it; the committed timing folders are 12, 62 and 86.
  - It downloads the audio from the manifest's public URL into the scratchpad, and runs G3 and repeat detection on the committed timing file's ayah starts and segments.
  - It writes `checks/mp3quran-audit-{moshaf}.json` (counts, keys, failing ayah keys).
  - It never writes into `apps/api/resources`.
- **Tests:** `tests/test_mp3quran_audit.py` (fixtures; asserts that nothing is written outside `checks/`); T7.
- **Done:** three audit records are committed. Any improvement to a live reciter is a separate PR with strict before/after G3 and G5 numbers and an ADR note. That is not part of this plan.
- **Model:** Haiku (the library already exists).

## Release blockers (per reciter)

0. The developer has accepted ADR 0077's amendments (the "Decisions that need the developer" section, items 1–3).
1. Q0–Q7 and Q9–Q11 merged. Q8 measured, and Q8a–Q8d merged if the measure or the reciter's report needs them (R7).
2. The spliced middle-gap test passed and its thresholds were frozen (Q6a).
3. The repeat calibration recorded: `passed`, or `REPEAT_MODE="null"` (Q7c).
4. The CI calibration run passed, and `QUALITY_VERSION` was frozen (Q10).
5. The A6(a) record passes at the report's exact `tool_version`, `params_digest` and `code_digest` (Q11, R5).
6. The reciter report says `Releasable: yes`, and `test_released_gated.py` is green on the release PR (R1–R7).
7. T1–T10 and B1–B5 green on every merged step. The MP3Quran golden and T3 are unchanged.
8. Still in force from `docs/plans/way2quran-reciter.md`:
   - the Sources credit in both languages (its step 9);
   - R2 immutable header and range requests verified on one Way2Quran object;
   - the billing alert;
   - the import idempotent on a second deploy;
   - the simulator exit check (Q13).
9. `composer qa`, the mobile checks and the contract regeneration green wherever touched.

## Edits to existing documents

| Document | Edit | When |
| --- | --- | --- |
| `docs/adr/0074-way2quran-reciters-hosted-on-r2.md` | A pointer line: decisions 8 and 11 are amended by ADR 0077 | with ADR 0077 (done) |
| `docs/adr/0060-taybah-generated-recitation-timings.md` | A pointer line to ADR 0077's reinterpretation (done); the A6(a) addendum (Q11); one release line per reciter (Q13) | as stated |
| `docs/plans/way2quran-reciter.md` | Steps 10 and 11 marked superseded by this plan | with ADR 0077 (done) |
| `docs/technical-spec.md` §7, line 458 | Quality mode and the `excluded` key | with ADR 0077 (done) |
| `docs/technical-spec.md` §12, line 678 | Released by a release PR tied to the gate report, not "by the developer" | with ADR 0077 (done) |
| `docs/technical-spec.md` §14 | The `tools.yml` pipeline line | with ADR 0077 (done) |
| `docs/technical-spec.md` §5 and §6 | Revisits table, pack table | Q8b and Q8c only |
| `docs/runbooks/way2quran-quality-run.md` | New | Q12 |

## Rollback

- **Before release:** the quality flag defaults off, so leaving it off restores today's Way2Quran path exactly (B3), and MP3Quran never changed.
- **After release:** remove the id from `way2quran_released_reciters`, and the reciter is hidden at the next deploy (ADR 0074).
- **A lost `pass` on a re-run** needs the timing file removed and the set pruned (the 0052-pattern migration). Until a prune command exists, the release guard refuses such a report (R6).

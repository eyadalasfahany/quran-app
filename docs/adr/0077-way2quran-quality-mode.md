# 0077 — Way2Quran quality mode: completeness, ASR anchors, repeat-aware alignment and the release gate

Date: 2026-11-07 · Status: **accepted by the coordinator** (design decisions of 7 Nov 2026, made under the developer's brief: the most accurate design, with big changes allowed where they raise accuracy and existing paths never get worse). Building and running (plan steps Q0–Q12) proceed on this. **The parts that change developer-owned decisions take effect when the developer accepts this ADR:** the amendments to ADR 0074 decisions 8 and 11, the reinterpretation of ADR 0060's rule, and the `CLAUDE.md` exception for release PRs (Consequences). Only the release step (Q13) waits for that acceptance · Amends ADR 0074 decisions 8 and 11 and reinterprets the "no surah-by-surah shipping" rule of ADR 0060 (`0060-taybah-generated-recitation-timings.md`, decision 9 and the 4 Nov decisions) for Way2Quran. ADR 0061 and ADR 0062 are unchanged and are applied to partial source files. Plan: `docs/plans/way2quran-quality.md`. Supersedes steps 10 and 11 of `docs/plans/way2quran-reciter.md`.

Numbering: 0077 is the next free number (the last ADR on `main` and in the working tree is 0076 on 7 Nov 2026). Two files are numbered 0060. In this ADR, "ADR 0060" always means `0060-taybah-generated-recitation-timings.md`.

## Context

ADR 0074 ships Way2Quran reciters with timings from the whole-surah aligner only (decision 6), gated by the A6(c) pause audit (decision 11). The first two CI runs failed safely, and they showed four problems.

1. **Partial files.** Reciter 3 (Ahmed bin Talib bin Hamid) has prayer recordings, and some of them are fragments:
   - 016 holds 16:53–16:119 of 128 ayahs;
   - 019 ends at 19:76 of 98;
   - 023 ends at 23:22 of 118.
   019 was *not* refused. Its last 27 ayahs were squeezed into the final 80 s at low confidence, so it would have shipped wrong timings if the run had not failed elsewhere.
2. **Drift.** Today's windowed aligner can stretch committed words over later audio, and it then runs out of frames.
   - Reciter 1 (Muhammad Abadh), 005: one window was given 1208 s of audio, and the run was refused at ayahs 85–103.
   - Reciter 3, 018: refused at 96–110.
   - ASR shows that both files are complete.
3. **Repeats.** Reciters repeat phrases. One span per word, with a monotonic aligner, puts an ayah start on the wrong occurrence.
   - 5:85 was placed 8 s early, over a repeat of the end of 5:84.
   - 5:31 was placed 8 s early, over a repeat of 5:30. Its first word got an 8.6 s span at confidence 0.988, so the 0.4 confidence floor cannot see it.
4. **No gate is enforced.** `ci.quality_summary` (`tools/recitation-align/recitation_align/ci.py:445`) only prints a table, and nothing writes `segments: null`. The pause audit gives false fails on reverberant or continuous audio: reciter 3's 015 has 0 detectable pauses at −22 to −40 dB, yet it is correct on 98 of 98 independent ASR probes.

Three design proposals (completeness, anchors, gate) and their critiques were measured on real files. The accuracy bar is QF's Mishary al-Afasy at word level.

## Decisions

### 1. One quality mode, Way2Quran only

- A single flag, **off by default**, turns on completeness, anchors, repeat-aware alignment and the gate together:
  - the workflow input `quality`, read only in steps guarded by `inputs.source == 'way2quran'`;
  - the script flag `--quality`, refused unless `--source-kind way2quran --aligner-only`.
- Reason for one flag: three flags (one per stage) were two too many, and partial combinations would be unreleasable anyway.
- **The MP3Quran path stays byte-identical:**
  - same aligned JSON, exported timing files, `quality.md`, PR body and job graph for the same inputs;
  - the live MP3Quran timing sets (`apps/api/resources/recitation-timings/mp3quran/{12,62,86}`) and QF data are not touched.
- **Every step of the plan runs one regression list,** spelled out in the plan:
  - the gate's checks T1–T10;
  - the anchors' checks B1–B5, with B1 restated: `align.py`, `anchors.py`, `repair.py` and `snap.py` are unchanged. `export.py` may only gain additive, flag-guarded code, proven by golden files.
- **Version:**
  - quality-mode documents carry `tool_version = "<__version__>+<QUALITY_VERSION>"`, which is written only when the flag is on;
  - MP3Quran documents keep today's `__version__` (`0.1.0`, `tools/recitation-align/recitation_align/__init__.py`);
  - any change to a quality parameter bumps `QUALITY_VERSION`;
  - every quality document and record also carries a `params_digest` (the parameters) and a `code_digest` (sha256 over the quality-path source files). The release guard compares both with the A6(a) record, so a code fix made after the calibration forces a new calibration.

### 2. Completeness: A's opening and ending keys, in CI, before upload

- **Keys.** The keys come from the Tanzil simple text, matched on derived `text.norm` copies only. The Quran text is never changed.
  - The opening key is the shortest span of 6, 8, … 24 words, taken after the basmala of ayah 1 (the basmala is not stripped for surahs 1 and 9), whose best `partial_ratio` against the rest of the surah is below 75.
  - The ending key is built the same way from the surah's last words. This lengthens keys automatically for refrains (55, 77) and for endings that echo earlier text.
- **Windows.** Windows start from the first and last sound (frame RMS above −40 dBFS) and are shared with the anchors' ASR schedule.
  - Head: 30 s windows, growing up to 120 s.
  - Tail: 30 s windows, growing up to 300 s.
  - A complete file needs no extra ASR calls beyond the anchors' schedule. An incomplete file adds at most 3 head and 9 tail calls.
- **Thresholds.**
  - PASS is 80 for both keys.
  - Measured margin: the lowest score of a complete file was 93.3, which is **+13.3**. The highest score of an incomplete file over every window tried was 58.1, which is **−21.9**. The gap between the classes is **35.2 points**.
  - 12 complete files were tested: 3 by fresh ASR (reciter 3's 018, reciter 1's 005 and 009) and 9 on cached transcripts of a complete reciter. All of them pass by the second window. The lowest final score among them was 93.1. (The completeness design note says "15 (6 + 9)"; three of its six fresh files were the incomplete ones.)
- **Verdicts.**
  - `complete`;
  - `incomplete-start`, `incomplete-end`, `incomplete-both`;
  - `incomplete-middle` (decision 2a);
  - `unverified` (nothing of the surah heard, or unreadable audio).
  - Everything except `complete` is excluded. Reason: a false `complete` ships wrong timings, while a false exclusion only makes a surah unavailable.
- **Where it runs.** Inside each Way2Quran align chunk:
  1. dry ingest (download, sha256, a manifest with no upload);
  2. the completeness verdict;
  3. alignment and the gate on the dry manifest;
  4. **upload last**, with `--source-dir`, for surahs whose final verdict is not `unavailable`.

  An incomplete file is never uploaded, aligned or probed, and never fails the chunk. Rejected alternatives:
  - a developer-run local pre-flight: the developer is never a step;
  - a separate pre-flight job with a second plan step: Actions cannot rebuild a matrix from a matrix job without an extra job, and it would download every file twice.
- **Where exclusions are applied.** Finalize moves excluded surahs from `files` to a new optional `excluded` map in `tools/mp3quran-ingest/mp3quran_ingest/way2quran_reciters.json`, before `merge_manifest`. The merge's "missing surah" refusal still guards everything else. Exclusions are recorded in the reciter report and listed in the PR.
- **Other rules.**
  - The duration screen (ms per normalised letter below 0.7× the median of the passing files) is a report flag only.
  - There is no manual `override: include` in this mode. An excluded surah comes back only when the lister sees a changed source file (different size or `Last-Modified`) and a new run checks it again.

### 2a. Middle gaps

- A middle gap needs **both** of these, and then the surah is `unavailable` (`incomplete-middle`):
  - **a pace break:** the implied pace between two consecutive located anchor windows lies outside 0.5–2.0× the surah's median. The skipped grid windows between them are then transcribed, and two adjacent 30 s windows locate more than 2 × (30 s × median pace) words apart, outside a refrain and outside a whole-surah fallback match;
  - **≥ 3 consecutive G3 failures** (BAD or UNSURE after repair) on the ayahs inside that break.
- A pace break alone is a report flag. G3 failures alone go to repair (decision 5).
- The thresholds are frozen only after a spliced-file test: 018 of reciter 3 with 900–1020 s removed must come out `incomplete-middle`, and the unspliced 018 must not.

### 3. Anchoring: ASR checkpoints, segmented alignment, no first pass

This is the anchors design, behind the quality flag.

- **Windows.** Fixed 30 s ASR windows on every 4th grid window (about 1 per 120 s), plus completeness's head and tail windows.
- **Locate.** Each window is located with `partial_ratio_alignment`:
  - forward, at score ≥ 72, over a region sized to the elapsed time;
  - otherwise over the whole surah, at score ≥ 85.
- **Repeats are never anchors.** A window that steps back more than 3 words is a `repeat`. Refrain ayahs (`anchors.usable_ayahs`) never become checkpoints.
- **Checkpoints and cuts.**
  - Checkpoints come from local CTC inside each window, which makes them frame-precise. An ayah start is used only when it is at least 2 words and 1.5 s inside the window, with confidence ≥ 0.55.
  - Cuts are made every ≥ 240 s, at checkpoint − 2 frames. The segments are aligned independently, with no first pass.
  - When a segment fails, the cut is dropped, the segment is merged with its neighbour, and the merge is logged.
- **Held-out checkpoints** (those not used as cuts) measure accuracy.
- **Measured results:**

  | Surah | Today's aligner | Anchored | Held-out word starts within 0.3 s |
  | --- | --- | --- | --- |
  | Abadh 005 | refused | 120 of 120 ayahs | 98.7% (1789/1813) at every 8th window, 240 s cuts; 98.6% (1694/1718) at every 4th, 120 s |
  | Reciter 3, 018 | refused | 110 of 110 ayahs | 99.6% (1066/1070) at every 8th, 240 s; 99.6% (981/985) at every 4th, 120 s |

  The adopted schedule (every 4th window, 240 s cuts) was measured directly only on reciter 3's 015 and 055 (2 and 1 cuts, 495/497 and 236/236 word starts) and, at ayah level, on 018 (40 of 41 held-out ayah starts within 0.3 s). Plan step Q4's real check measures it on 005 and 018 before the parameters freeze.

  - Where today's aligner works, the anchored output is equal to the millisecond: 111, 99 and 78 ayah starts, and 1562, 657 and 356 word starts, on MP3Quran 62:017 and reciter 3's 015 and 055.
  - 62:017 against its published timings: 104 of 105 ayah starts are within 0.3 s. The one miss (17:51, −0.49 s) gives the same value with today's aligner.
  - Independent Whisper check of every final ayah start: 005 gives 115 of 119 and 018 gives 108 of 109. The two real misses are the repeats 5:31 and 5:85; the others are garbled ASR at a correct start.
- **Fail-safe.** Anchored output exists only when all three hold:
  - completeness says `complete`;
  - there is ≥ 1 checkpoint per 600 s;
  - there is no unresolved pace break.

  Otherwise there is no anchored output, and **the drifting aligner is never used as a fallback**. Such a surah is `no_highlight`, which counts against the cap.
- The anchors' own final-window completeness rule is dropped: completeness (decision 2) is the only completeness mechanism.

### 4. Repeats are built now: the repeat-aware stage

The earlier "stage 2 / phase 2" deferral is dropped (accuracy bar). The stage is behind the quality flag.

1. **Detect.** A region is a candidate when any of these holds:
   - a word that is not the last of its ayah lasts more than 4× (letters × surah pace) and more than 2.5 s;
   - an anchor window steps back, or its ASR holds more than 1.25× the words of the span it matched;
   - a G3 BAD or UNSURE.

   The region runs from the start of ayah n−1 to the end of ayah n+1.
2. **Find.** Run dense ASR on the region (10 s windows, 5 s hop). A dynamic-programming map takes the ASR words to Tanzil words, with match, insert, delete and a penalised back-jump to any earlier word in the region. Normalised keys only.
3. **Confirm.** The expanded sequence is accepted only if CTC also prefers it: its mean log-prob per frame must beat the plain sequence by more than 0.02 over the same frames. This is the `decide_basmala` pattern: two independent models must agree.
4. **Re-align** the region against the expanded tokens, with one words-list entry per occurrence, sorted by `(ayah, start_ms)`. The ayah start is the first occurrence.
5. **Calibrate** on QF Afasy's repeat ayahs (991 across the Quran, per ADR 0060 consequences). Targets:
   - ≥ 90% of QF repeat occurrences reproduced as the same position sequence;
   - word starts on those occurrences: median ≤ 60 ms and p90 ≤ 150 ms;
   - 0 false repeats on ayahs without repeats.
   - If the stage misses these targets, a repeat region is written as `segments_null` instead of as repeated positions.

**Format.** A repeat inside one ayah uses **today's format 1**, so no format change is needed:
- `TaybahTimingImporter::validSegments` (`apps/api/app/Domains/Content/Services/TaybahTimingImporter.php:301`) requires only that the distinct positions are 1..N, which `TaybahTimingImportTest.php:335` tests;
- the app's `activeWordPosition` (`apps/mobile/src/features/audio/active-ayah.ts`) and `timings.ts` handle repeated positions, as `timings.test.ts` "repeats kept" and "highlights the repeated word positions" test;
- `export.map_segments` already writes segments in recited order.

**Cross-ayah back-jumps** (ayah n starts, then n−1's words are recited again) cannot be expressed in format 1. They are **measured first**, on the Abadh audio and on MP3Quran 62 surah 17.
- If any exist, an optional format 2 `revisits` list is added in this same plan. It touches:
  - the export writer;
  - `TaybahTimingFileReader` and `TaybahTimingImporter`;
  - an additive revisits table;
  - `PackSchema`;
  - mobile `timings.ts`, with tests.

  Format 1 files are still read unchanged, and QF and MP3Quran rows stay valid.
- Until format 2 ships for a reciter, its cross-ayah ayahs are `segments_null`, with the ayah start at the pass that continues into n. A report with an unrepresented cross-ayah jump is not releasable (release rule R7).

### 5. The gate, repair and verdicts

**The gate runs on the exact bytes whose sha256 matches the manifest.**

| Check | What it tests | Rule |
| --- | --- | --- |
| G0 | Completeness | `complete` (decision 2), otherwise `unavailable` |
| G1 | Structure | The aligner did not refuse, and the export builds the surah |
| G2 | End coverage | The last ayah start and the last word start are probed OK, and the tail after the last word is ≤ 60 s or is completeness's measured `trailing_s` |
| **G3** | **Independent check of every ayah start 2..N** | See below |
| G4 | Word onsets | A screen only. It has a 13% false-BAD rate on QF ground truth and cannot see a 300 ms offset |
| G5 | Anchors' held-out word starts, outside repeat regions | ≥ 97% within 0.3 s and median ≤ 50 ms. Not applied below 20 held-out words |
| G6 | Confidence floor | 0.4 mean word confidence per ayah, basmala excluded. An ayah below it is `segments_null` |
| Stretch | Words longer than 4× expected and longer than 2.5 s | Catches 5:31, which G6 misses (confidence 0.988) |
| — | Pause audit | Report only. Its density is `n/a` below 0.8 pauses per ayah. "83% steady" is dropped for Way2Quran, because it has no reference to be steady against |

**G3 in detail.**
- The clip is [start − 0.3 s, start + 4.5 s], transcribed by the pinned Whisper and matched against local text only: all of n−1, all of n and the first 8 words of n+1.
- OK only when the match begins at word 0 of n, or in the last word of n−1, at score ≥ 75. One re-probe runs, at pre-roll 0.0 and 0.6 s, and the worse result counts.
- A refrain ayah counts only when the unique ayahs on both sides pass.
- Probes within 3 s of an anchor cut move to the next start, so the anchor never agrees with itself.
- **Evidence:**
  - **0 false alarms in 139 true probes** (QF Afasy 36: 41 of 41; reciter 3's 015: 98 of 98);
  - 019's squeezed tail: 9 of 9 flagged;
  - starts 1.5 s late: 12 of 15 flagged; 3 s late: 15 of 15;
  - a two-ayah refrain shift in 055: 15 of 15 unique-ayah probes flagged;
  - 5:85: BAD, "heard 84:9", score 83, which the lenient rule had passed.
- **Known blind spot:** starts 1.5 s *early* that fall in a breath are caught only 4 of 15 times. They are bounded by G5, by snapping and by the Afasy calibration. Recorded, not blocking.

**Repair** runs per ayah before any verdict.
- It is triggered by a G3 BAD or UNSURE, a stretched word, a G5 outlier (a held-out checkpoint more than 1 s from the final ayah start, outside repeats), or a first word with confidence below 0.5 that is also stretched.
- It runs the repeat-aware stage (decision 4) on the region. A late start that is not a repeat is handled differently: 0.5 s stepped probes until n:0 is heard at score ≥ 85, then the CTC onset of word 0 near that point.
- A repair is accepted only if the whole region then passes G3, G5 and the stretch check.

**Verdicts:**
- per surah: `pass`, or `repaired` (both ship timings);
- per ayah: `segments_null` (the ayah timing ships, its words are not highlighted);
- per surah: `no_highlight`, the last resort. It applies when an ayah start is still wrong after repair, when more than 10% of the surah's ayahs are `segments_null`, when G5 still fails after repair, or when the anchors' fail-safe fires. The audio ships and no timing file is exported (ADR 0060 decision 8: the surah plays without highlight). Target 0;
- per surah: `unavailable` (decision 2 or 2a).

### 6. Release

- **The workflow PR** carries the manifest, the timing files of `pass` and `repaired` surahs, the `excluded` change and the reciter report `tools/recitation-align/checks/way2quran-{id}.json`.
  - Its body opens with `Releasable: yes` or `Releasable: no (rules failed: …)`.
  - Merging it imports the reciter **hidden** (ADR 0074 decision 8 is unchanged on that point).
- **The coordinator, not the developer, then opens a one-line release PR.** It adds the id to `quran.way2quran_released_reciters` (`apps/api/config/quran.php:130`) and adds one ADR 0060 addendum line that points at the report.
  - `tools/recitation-align/tests/test_released_gated.py` fails unless the report matches the committed data and every release rule holds. It runs in a new `tools.yml` workflow on PRs. PRs that the add-reciter bot opens with `GITHUB_TOKEN` do not trigger other workflows, so the release PR is opened with a user token, and its `tools.yml` run must exist and be green. The test also runs in every add-reciter finalize, because finalize runs the whole suite; there it compares against `HEAD`.
- **Release rules,** each counted on the reciter:
  - **R1.** Every listed surah has a verdict tied to the manifest sha256. The report is in quality mode, with all sections present.
  - **R2.** `no_highlight` surahs number at most ⌊1% × available surahs⌋, and they hold at most 1% of available ayahs. So Ebadi's 54 surahs allow none, and 114 surahs allow one.
  - **R3.** `segments_null` ayahs are at most 2% of available ayahs.
  - **R4.** `unavailable` surahs are at most 10% of the surahs the source lists. Above that, the source itself is suspect.
  - **R5.** A passing A6(a) Afasy record exists for the report's exact `tool_version`, `params_digest` and `code_digest` (decision 6a).
  - **R6.** No committed timing file lacks a `pass` or `repaired` verdict for the same audio sha. A re-run must not drop a `pass` that the previous committed report had, because the importer never deletes.
  - **R7.** No cross-ayah back-jump is left unrepresented.
- **Above any cap the reciter is held.** Its failing surahs become work items. Nothing is shipped half-highlighted as a normal outcome.
- **Removed: the developer's listening spot check.** Reasons: the developer is never a step, and listening is not ground truth (ADR 0060 decision 9). G3's independent ASR check of every ayah start replaces it.

### 6a. A6(a): the Afasy word-level calibration, before the first release

- The full quality pipeline runs on QF Afasy (QF 7) audio for surahs 1, 36, 59, 18 and 2, at the frozen `QUALITY_VERSION`, and is compared with QF's word segments on ayahs without repeats.
- Targets:
  - word starts: median ≤ 60 ms, p90 ≤ 150 ms, p99 ≤ 400 ms;
  - ayah starts: 95% within 0.3 s and none beyond 1 s;
  - G3: 0 false BADs.
- It runs **locally**, because the QF references (`tools/recitation-align/out/a6/ref/qf-*.json`) are gitignored QF data and are never committed.
  - Only metrics and the version go into `tools/recitation-align/checks/a6a-afasy.json` and an ADR 0060 addendum.
  - The repeat calibration of decision 4 uses the same rule.

### 7. CI

- **Chunks.** Way2Quran uses `chunks=20` (`MAX_CHUNKS`, `ci.py:41`). The shared `chunks` input's default becomes empty: `ci_plan` maps empty to 6 for MP3Quran and 20 for Way2Quran, and a golden test proves that the MP3Quran plan output is the same for empty and `6`. The anchors design proposed 8 chunks and the gate design 12; neither is used.
- **Whisper cache.** A Whisper cache step runs for Way2Quran only, keyed `hf-asr-${{ runner.os }}-<ASR_REVISION>`. Reason: the existing `hf-…` entry was saved before ASR ran, so it hits, and `actions/cache` never re-saves it, which means Whisper would be downloaded in every job.
- **Resumable artifacts.** All ASR, completeness and gate JSON travel in the per-chunk `align-w2q-{id}-{chunk}` artifacts, so `resume_run_id` reuses them.
- **Timings.**
  - Measured CI baseline: emissions plus alignment run at **RTF 0.328 on 4 vCPU** (run 42377232546, chunk 2: 5.44 h of audio in 1.78 h).
  - Local Whisper runs at RTF 0.32–0.36. G3 takes about 2.2–2.5 s per probe locally.
  - Estimates, to be measured: Whisper in CI at RTF 0.65–1.0, G3 at about 5 s per probe, about 75–95 min per chunk at 20 chunks.
- **Calibration run.** A calibration run (calibration mode: dry ingest, no upload, no PR) measures CI speed on known surahs before any reciter run. The rule, fixed in advance: if the projected chunk time is above 240 min, `ASR_EVERY` moves from 4 to 6 (every 6 and every 8 both passed on 005), `QUALITY_VERSION` is bumped, and G3 density is never reduced.

### 8. MP3Quran, later, in separate verified PRs

- G3 and repeat detection run in **report-only** mode on the live MP3Quran reciters (resources 38, 41 and 42; committed timing folders 12, 62 and 86, mapped from the manifest).
- A live reciter changes only through its own PR whose before/after numbers show a strict improvement, for example 62's 17:82 repeat.
- Nothing in the MP3Quran PR path changes.

### 9. Re-runs

- Reciter 2 (Ebadi) gets his first run, in quality mode, first.
- Reciters 3 and 1 get **fresh** runs, never resumed from the pre-quality runs, because their outputs change. Abadh, the heaviest repeater, goes last.
- Finalize refuses a quality-mode surah that lacks completeness or gate files, so a resume from old artifacts cannot slip through.

## Reinterpretation of ADR 0060's "no surah-by-surah shipping" for Way2Quran

- **The rule's purpose was that a reciter appears once, as a whole, and is never trickled out over several deploys. That purpose is kept:** the reciter is released once, by one release PR, with its whole available audio set.
- Verdicts are per surah, and differences between surahs are allowed in two places only:
  1. **A source file that does not hold the surah** is the ADR 0061 / ADR 0074 "surah the source lacks" case. It is shown as unavailable (ADR 0062 row). This is not a breach of ADR 0060, whose rule was about Taybah-aligned surahs of complete audio.
  2. **A complete surah whose timings cannot be verified** plays without highlight (ADR 0060 decision 8). It is capped by R2 (≤ ⌊1%⌋ of surahs and ≤ 1% of ayahs; target 0). Above the cap the whole reciter stays hidden, which keeps the original rule's protection against systematic failure.
- For Way2Quran, ADR 0074 decision 11's pause-audit gate (90% at a pause, 83% steady, "one failing surah keeps the whole reciter hidden") is replaced by decisions 5 and 6 of this ADR. The pause audit stays as a report.

## Consequences

- **No API, importer, format or app change** is needed unless the cross-ayah measurement finds back-jumps. `no_highlight` is "no file", and `segments_null` is already accepted.
- **New committed data:**
  - the `excluded` map in `way2quran_reciters.json` (optional; absent means the file is byte-identical to today's);
  - `tools/recitation-align/checks/` (the reciter reports, `a6a-afasy.json` and `calibration-surahs.json`).

  The importer never reads `checks/`.
- **New CI:**
  - the `tools.yml` workflow (both tools' pytest suites, the release guard);
  - in `add-reciter.yml`, the Way2Quran-only `quality` and `calibrate` inputs and steps.
- **Cost.** CI time per Way2Quran reciter grows to roughly 5–12 CPU-h for ASR (estimate), spread over 20 chunks. Accuracy is chosen over cost.
- **Remaining gaps:** early starts inside a breath (decision 5), and the same Whisper model used by anchors and gate (a second aligner model would be a new dependency under the 12-month rule; not added).
- **Release practice.** `CLAUDE.md` says the developer commits and pushes. Release PRs opened by the coordinator are proposed here as an exception for Way2Quran releases; it takes effect on the developer's acceptance (Status). The workflow bot already pushes reciter branches.

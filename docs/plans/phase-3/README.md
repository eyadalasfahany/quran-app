# Phase 3 — implementation briefs

One file per step of [`../phase-3.md`](../phase-3.md). Send a Haiku agent *"Implement `docs/plans/phase-3/step-NN-….md`. Follow `docs/plans/phase-3/README.md`."* The reviewer checks the diff, the gates and the iPhone 17 simulator against the frames; the developer commits. Do not reimplement a step marked done in `../phase-3.md`.

| Step | Brief | Needs | Status |
| --- | --- | --- | --- |
| 1 | [step-01-audio-data.md](step-01-audio-data.md) | — | Done (29 Oct 2026). On the branch |
| 1b | [step-01b-default-reciter.md](step-01b-default-reciter.md) | 1 | Done (29 Oct 2026): API `c02e023`; device migration 0006 |
| 2 | [step-02-player-core.md](step-02-player-core.md) | 1 | Done (single `AudioPlayer`) |
| 2b | [step-02b-playlist.md](step-02b-playlist.md) | 2 | In progress: `AudioPlaylist` engine |
| 3 | [step-03-audio-to-ayah.md](step-03-audio-to-ayah.md) | 2 | |
| 4 | [step-04-players-ui.md](step-04-players-ui.md) | 2, 3 | |
| 5 | [step-05-repeat-speed-sleep.md](step-05-repeat-speed-sleep.md) | 3 | |
| 6 | [step-06-reciters.md](step-06-reciters.md) | 1, 2 | Done (29 Oct 2026): the Listen tab |
| 6b | [step-06b-reciter-style.md](step-06b-reciter-style.md) | 6 | Part 1 (API) on the developer's Mac, then part 2 (device) |
| 7 | [step-07-audio-downloads.md](step-07-audio-downloads.md) | 2, Phase 2 step 13 | |
| 8 | [step-08-exit-check.md](step-08-exit-check.md) | all | |

## Rules for every step
Everything in [`../phase-2/README.md`](../phase-2/README.md) applies: one component per file with its own test, screens only compose, `apple-design` skill, tokens through `useTheme()`, identical to the frames, the iPhone 17 visual check, gates. Added for audio:
- **Audio sources:** only the URLs in `chapter_audio_files` (QF's, ADR 0008). The app never calls QF otherwise; credentials stay in `apps/api`.
- **Media controls follow the layout direction** (ADR 0012): in Arabic the progress fills from the right with elapsed time on the right, and next ayah sits on the left with its glyph pointing left. In English all of it mirrors. Play and pause glyphs never flip. Time labels (elapsed and total) always show once the duration is known.
- **State:** player queue, active ayah/word, repeat, speed and sleep timer live in `playerStore` (Zustand). Last listened goes to `user.db` `recent_listens`.
- **Motion:** highlight changes use `timing('fast')`; Reduce Motion turns follow-scroll animations into jumps.
- **Native changes** (`expo-audio`, background mode) need `expo prebuild -p ios` and a rebuild; the reviewer does it.
- **Gates:** `cd apps/mobile && npm run lint && node_modules/.bin/tsc --noEmit && npm test`, plus `npm exec --yes --package=expo-doctor -- expo-doctor` and `node .github/scripts/npm-audit.mjs` when dependencies change.

# Step 2 — Player core

Follow [README.md](README.md). Needs step 1.

**Goal:** a surah plays from the QF audio URL in the background with lock-screen controls.

- `npx expo install expo-audio` (content plan pin ~58.0.10); `app.config.ts`: iOS `UIBackgroundModes: ['audio']`, Android foreground service as `expo-audio` requires. Native rebuild by the reviewer.
- `src/features/audio/playerStore.ts` (Zustand): `reciterId`, `queue` (one file per surah), `chapterId`, `status` (`idle | loading | playing | paused | error`), `positionMs`, `durationMs`, `speed`, `activeVerseId`, `activeWord`.
- `src/features/audio/player.ts`: one `expo-audio` player; `playChapter(chapterId, fromMs?)`, `playFromVerse(verseKey)` (loads the file and seeks to the verse's `startMs`), `pause`, `resume`, `seek`, `next/previous surah`; end of surah → next surah; lock-screen metadata (reciter, surah name, app icon as artwork, D4) and remote play/pause/next/previous.
- Resume: last chapter and position saved on pause/background (MMKV), restored on next launch without auto-playing.
- Errors (offline stream, 404) set `status: 'error'` with a reason; no crash.
- Tests: store transitions; `playFromVerse` seeks to the timing; end of surah advances; error path. Mock `expo-audio` the way other native modules are mocked in `jest.setup.ts`.

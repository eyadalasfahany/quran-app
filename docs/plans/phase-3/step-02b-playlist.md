# Step 2b — AudioPlaylist engine

Follow [README.md](README.md). Needs step 2. Decision (developer, 29 Oct 2026): switch from one `AudioPlayer` to `AudioPlaylist`, so the lock screen gets next and previous surah and surahs follow each other without a gap. Every control the frames draw still works: `seekTo`, `pause` and `playbackRate`.

## What the spike showed (expo-audio 58.0.10, iPhone 17 simulator, 29 Oct 2026)
- **No failure signal.** `AudioPlaylistStatus` has no `error`. `AudioPlaylist.swift` updates `isLoaded` only on `.readyToPlay` and has no `.failed` branch.
  - A bad URL or a 404 stays `isLoaded: false`, `isBuffering: true`, `duration: 0` forever after `play()`.
  - **Offline**, about 15 s after `play()`, iOS skips through the remaining items: `trackChanged` 0→1→2 within 15 ms, every one still `isLoaded: false`.
  - A healthy load reached `isLoaded: true` in 240–290 ms.
- **Rate:** the `playbackRate` setter only sets `AVQueuePlayer.rate`, clamped to 0.1–2.0, and sets no `audioTimePitchAlgorithm`, so the item default applies. The rate survives `next()` and natural track changes.
- **Track change:** at the end of a track, `trackChanged` fires and the next item plays within 5 ms. `didJustFinish` stays false on a track change.
- **Lock screen:** `MediaController` enables next and previous only when `setActiveForLockScreen` gets `{ showNextTrack: true, showPreviousTrack: true }`. The metadata does not follow the track by itself.

## Build (`src/features/audio/player.ts`; the exports and their behaviour stay)
1. **One playlist per reciter session:** the reciter's 114 surah files in order, from `chapter_audio_files` (`createAudioPlaylist({ sources })`, after the same `setAudioModeAsync`). `playChapter(n)` does `skipTo(n - 1)`. It reuses the playlist while the reciter is unchanged and rebuilds it when the reciter changes. A surah without an audio row has no file to queue: rebuild with only the rows that exist, and keep a map from index to chapter id.
2. **Lock screen:** `setActiveForLockScreen(true, metadata, { showNextTrack: true, showPreviousTrack: true })`, and `updateLockScreenMetadata` on every `trackChanged`. Remote next and previous arrive as `trackChanged`, so they need no extra wiring.
3. **Status:**
   - Map `playlistStatusUpdate` to the store as the single player did: `playing`, `currentTime`, and `duration` once loaded.
   - `trackChanged` sets `chapterId` from the index map, resets the position, and saves the resume state.
   - The end of surah 114 (last index, `playing` false, `currentTime` at or near `duration`, or `didJustFinish`) stops, as before.
4. **Watchdog (no error signal exists):**
   - After a `play()` or a `trackChanged` while playing, if `isLoaded` is still false 10 s later, pause and set `status: 'error'`, `error: 'load-failed'`.
   - A `trackChanged` that arrives while the current item never loaded is the offline skip: pause at once, go back to the failed index, and fail with `load-failed`. Never let the queue run through surahs it couldn't load.
   - `not-found` is no longer produced, because a 404 looks the same as any failure. Keep the code in the union for the single-player history; the UI maps it to the same message.
5. **Speed:** set `playbackRate` on the playlist. Pitch is the item default (unverified by ear; the exit check covers it).
6. **Seek, pause, resume and restore** behave as today. The resume state is saved on pause, on background and on `trackChanged`. `previousSurah()` and `nextSurah()` call `previous()` and `next()`.
7. **Tests:** update the fake in `apps/mobile/jest/` into a fake playlist that can emit `playlistStatusUpdate` and `trackChanged`. Cover: the watchdog firing at 10 s (fake timers), the offline skip caught at the first `trackChanged` without loading, `trackChanged` updating the chapter and the lock-screen metadata, the lock-screen options passed, a reciter change rebuilding the playlist, a surah with no audio row skipped in the index map, and the existing player tests kept green.

## Device check (developer, iPhone 17)
Lock-screen next and previous change the surah and the title; at 0.75, 1.5 and 2× the voice keeps its pitch; 112 into 113 has no audible gap; offline shows the error within about 10 s and doesn't skip surahs.

# Prompt 5 — Azkar audio rights model and UI states (step 8)

You are working in the Taybah monorepo, Expo app `apps/mobile`, branch `ft/azkar`. Don't commit, add dependencies, or edit `apps/mobile/android/`, `src/features/salah/**`, or the Quran audio download manager's behaviour.

**Read first:** @AGENTS.md @apps/mobile/CLAUDE.md @.claude/agent-rules.md @docs/adr/0031-azkar.md (§8) @docs/plans/phase-6/step-08-audio-rights.md (implement it exactly).

**Hard rules:**
- **No OpenDua audio is used in any way:** no streaming, downloading, proxying, caching or bundling. Production has zero `azkar_recordings` rows.
- A recording with `rights_verified_at = null` counts as no audio.
- With no legal audio, **render no audio controls at all**: no disabled play or download buttons.
- **Don't build a second download manager.** Add the `AzkarDownloadPort` interface and `NoAudioDownloadPort`. Generalising `features/audio/downloads/manager.ts` waits until a licensed recording exists; add that follow-up note to `docs/plans/phase-6.md`.

**Developer, 1 Nov 2026: build the full player now; it shows only for licensed recordings (none today).**
- **Player:**
  - play/pause, a thin progress bar with elapsed and total time, and replay
  - it plays the current unit's recording
  - optional «تشغيل تلقائي» (a stored preference): when the unit's audio ends, the reader advances, keeping the counter rules (it never counts on the user's behalf)
  - stops on leaving the reader, on switching units, and when another audio starts
  - Reduce Motion respected; lock-screen metadata only if the Quran player pattern allows it without touching `playerStore`
- **Visibility:** everything renders nothing while `audioAvailability()` is `none`. Tests use a fake licensed recording (a placeholder URL, `rights_verified_at` set) to cover the player.

**Build:**
- `audio/availability.ts`, `audio/attribution.ts`, `audio/downloads.ts`
- `playAzkarRecording`, which must not touch the Quran `playerStore`
- components `AzkarAudioButton`, `AzkarDownloadButton`, `AzkarDownloadRow`, `AzkarStorageSummary`, `AzkarAttributionLine`
- `AzkarDownloadsScreen` → `app/azkar/downloads.tsx`
  - empty state with the port reporting nothing
  - populated rows with a fake port, in tests only
- Wire `AzkarAudioButton` into the reader's action row. It renders nothing today.
- Frames: `AzkarReaderAudio`, `AzkarDownloads`, `AzkarDownloadsEmpty`.

**Tests:**
- every `audioAvailability` combination
- the attribution fallback
- the components render nothing without rights
- the download button's states with a fake port
- the screen, empty and populated
- Arabic and English, and accessibility

**Gates** (Node 26, `apps/mobile`): `npm run lint`, `npx tsc --noEmit` (0), `npx jest src/features/azkar __tests__`.

**Report:** files, test counts, gates.

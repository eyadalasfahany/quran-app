# Step 8 — Azkar audio rights and states

ADR 0031 §8, as amended by ADR 0040 (1 Nov 2026): the opening rule below is superseded, the recordings now ship hosted by Taybah, and `docs/plans/phase-6/step-14-audio-and-storage.md` switches this logic on. Original text: **OpenDua recordings are not streamed, downloaded, proxied, cached, re-hosted or bundled.** The importer imports no recording rows until rights are verified (step 3), so production has zero `azkar_recordings`. This step builds the rights logic and the UI states so a licensed recording can be added later with no schema change.

## Rights logic (`src/features/azkar/audio/`)
- `availability.ts` (pure): `audioAvailability(recording | null, { online, downloaded })` returns one of:
  - `none`: no recording, or `stream_allowed = 0` and `download_allowed = 0`
  - `stream`: streaming allowed, online
  - `stream_offline`: streaming allowed, offline, not downloaded
  - `local`: downloaded and `download_allowed = 1`

  Also `canDownload(recording)` = `download_allowed === 1`. A recording with `rights_verified_at = null` is always `none`, whatever its flags.
- `attribution.ts`: the attribution line by locale (`attribution_ar` / `attribution_en`; when the Arabic is empty, fall back to the English line, never translate it), plus the licence name and URL.

## Playback and downloads (reuse, don't duplicate)
- **Playback:** a thin `playAzkarRecording(recording)` that plays one file through `expo-audio`, the same library the Quran player uses. It must not touch `playerStore` (that is the Quran queue). Pause and stop on blur. It runs only when `audioAvailability` is `stream` or `local`.
- **Downloads:** **don't build a second manager.** `features/audio/downloads/manager.ts` is keyed by Quran `audio_file_id`. Generalising it (an additive `user.db` change: an owner `kind` and a generic key) waits until the first licensed recording exists, so it can be tested end to end without risking Quran downloads. Record this in `phase-6.md` as a follow-up. In this step:
  - `downloads.ts` with an `AzkarDownloadPort` interface (`enqueue`, `cancel`, `remove`, `removeCategory`, `status`, `storageBytes`) and a `NoAudioDownloadPort` that reports nothing downloadable.
  - Hooks that read through the port.

## UI (frames `AzkarReaderAudio`, `AzkarDownloads`, `AzkarDownloadsEmpty`)
Components, each with its colocated test:
- `AzkarAudioButton`: renders **nothing** for `none`; a play/pause button for `stream` / `local`; for `stream_offline` a disabled-looking pill «غير متاح دون اتصال» with an accessibility hint (this is real state, not a fake control).
- `AzkarDownloadButton`: renders **nothing** unless `canDownload`; states idle, downloading (progress, cancel), done (remove), failed (retry).
- `AzkarDownloadRow`, `AzkarStorageSummary`, `AzkarAttributionLine`.
- **Screen:** `app/azkar/downloads.tsx` → `AzkarDownloadsScreen`. With the port reporting nothing, it shows the `AzkarDownloadsEmpty` state (no buttons). With a fake port in tests, it shows the done, downloading and failed rows and «حذف الكل».
- **Entry point:** from Azkar Home's overflow, and only when at least one recording has `download_allowed = 1`. Today that is never.

## Tests
- `audioAvailability` for every combination, including `rights_verified_at = null` → `none`
- attribution fallback
- the components render nothing without rights
- the download button states with a fake port
- the downloads screen empty and populated (fake port)
- RTL/LTR and accessibility labels

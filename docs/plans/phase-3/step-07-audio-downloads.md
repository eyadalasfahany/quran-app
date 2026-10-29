# Step 7 — Audio downloads

Follow [README.md](README.md). Needs step 2 and Phase 2 step 13 (`DownloadRow`).

- Per-surah download of the QF audio file with `expo-file-system` (progress, resume after interruption, cancel), into the document directory; `user.db` `downloads` table (spec §6: `audio_file_id`, `local_path`, `size_bytes`, `status`, `progress`, `downloaded_at`).
- **Wi-Fi only** by default (Settings listening toggle, as the `Settings` frame draws it); on cellular the download waits with a clear state.
- Playback prefers the local file; falls back to streaming.
- `Downloads` screen recitations card identical to the frame («تنزيل الكل», per-surah rows, storage bar segment for recitations), using `DownloadRow`; delete frees the file.
- Tests: download progress/cancel/resume; Wi-Fi gate; local-first playback; delete.

## Plan (approved by the developer, 29 Oct 2026, including `expo-network`)

### Licence question to settle first
The content plan leaves this open: "May downloaded recitation audio be kept on the device beyond 7 days, and does it count as Content Sync content?" (`docs/content-plan.md`, open questions). Until QF answers, the build follows the strict reading, the same rule as packs:
- A download records `verified_at`.
- On every launch with a network, the app re-checks each downloaded surah against its recitation pack's current `audio_url` and size, and refreshes `verified_at`.
- A file not verified for 7 days stays playable only when online, so playback streams instead. A setting can delete unverified files.

**If QF allows keeping audio, this rule is dropped.** It must be confirmed before release, not before building.

### Data
- **`user.db` table `downloads`** (spec §6): `audio_file_id` PK, `local_path`, `size_bytes`, `status` (`queued | downloading | paused | done | failed`), `progress`, `downloaded_at`, plus `verified_at`, `reciter_resource_id` and `chapter_id`. It's a migration after 4c's.
- **Files:** `Paths.document/audio/{reciterResourceId}/{chapterId}.{format}` (`expo-file-system`, already installed at ~58.0.13, which is in the content plan's table). A downloaded file is removed when its reciter's pack is removed, or on delete.

### Download manager (`src/features/audio/downloads/`)
- A queue with one active download at a time, with progress and cancel. Resume after interruption uses the resumable download from `expo-file-system`, with its saved state in the row.
- The size comes from `Content-Length`, not the row: QF sends Husary's size in KB (`phase-3.md`, "Prelive data").
- **Wi-Fi only (default on):** on cellular, a queued item waits with the state «بانتظار Wi-Fi» and starts when Wi-Fi returns. Detecting the network type needs **`expo-network`**. It's Expo-managed, but **not yet in the content plan's version table**, so adding it is part of this step's approval (version pinned by `npx expo install`).
- The setting is in `Settings`' listening section, as the frame draws it («التنزيل عبر Wi-Fi فقط»), stored with the audio settings (MMKV).

### Playback
`player.ts` builds each playlist source from the local file when its row is `done`, and from the QF URL otherwise. A download that finishes during playback is used from the next surah. The current file isn't swapped mid-play.

### UI
- **Listen tab:** «المحمّلة» filters reciters with at least one downloaded surah; the status line «سور محمّلة» shows the count.
- **Reciter's surah list:** a «⋯» row action (the frame's «خيارات القارئ») opens a list of the 114 surahs with `DownloadRow`s and «تنزيل الكل».
- **`Downloads` screen recitations card,** identical to the frame: per-reciter rows, the storage bar segment, delete.
- Each component has its own test.

### Order
4c first (its migration comes first). Then data and the manager, then playback, then the UI.

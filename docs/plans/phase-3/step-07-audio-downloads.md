# Step 7 — Audio downloads

Follow [README.md](README.md). Needs step 2 and Phase 2 step 13 (`DownloadRow`).

- Per-surah download of the QF audio file with `expo-file-system` (progress, resume after interruption, cancel), into the document directory; `user.db` `downloads` table (spec §6: `audio_file_id`, `local_path`, `size_bytes`, `status`, `progress`, `downloaded_at`).
- **Wi-Fi only** by default (Settings listening toggle, as the `Settings` frame draws it); on cellular the download waits with a clear state.
- Playback prefers the local file; falls back to streaming.
- `Downloads` screen recitations card identical to the frame («تنزيل الكل», per-surah rows, storage bar segment for recitations), using `DownloadRow`; delete frees the file.
- Tests: download progress/cancel/resume; Wi-Fi gate; local-first playback; delete.

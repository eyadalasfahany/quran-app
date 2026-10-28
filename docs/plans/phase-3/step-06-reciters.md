# Step 6 — Reciters

Follow [README.md](README.md). Needs steps 1–2.

- The `Reciters` frame: the list of reciters (Arabic name in Arabic, English in English; same `name_ar` rule as tafsirs, API override map if QF's Arabic names have quirks), the chosen one marked, per-reciter download state using `DownloadRow` (pack + timings only; surah audio is step 7).
- Choosing a reciter sets the default (`reciterId`) and, while playing, switches at the current ayah's `startMs` in the new reciter's file.
- Reached from the player and from Settings' listening section, as the frames link it.
- If the API needs `name_ar` for recitations, extend step 12's catalogue sync to the `chapter_recitations` group (API brief, separate agent).

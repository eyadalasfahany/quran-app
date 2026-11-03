# 0052 — Highlight only when the timings match the audio

Date: 2026-11-03 · Status: accepted (developer, 3 Nov 2026) · Amends spec §12 ("Word highlight", "Validation on ingest").

## Context

The developer asked that no reciter ever show a highlight that is out of sync with the recitation. Until now the API skipped only segments with no timing, and the app rejected a file's timings only when a row had `start_ms ≥ end_ms` or two rows overlapped. Nothing checked that the timings cover the whole surah or that they belong to the audio file that plays.

An audit of the 20 local chapter reciters on 3 Nov 2026 (2,280 files, 124,665 ayah timings against 124,720 ayahs) found two that are out of sync:

- **Abdullah Ali Jabir** (QF chapter reciter 158). Its timings do not match its audio file. For surah 5, only 5–18% of ayah starts fall within 0.7 s of a pause in the audio (Mishary al-Afasy: 97–100%), the worst ayah is 8.8 s off, and about 4 minutes of recitation follow the last timing. 41 of its surahs end their timings 5 s or more before the file ends (up to 13 minutes). The file it plays comes from `download.quranicaudio.com/quran/ali_jaber/`, not QF's `/qdc/` path, so the timings were most likely made for another recording.
- **Muhammad Siddiq al-Minshawi (with kids)** (QF chapter reciter 168). Surah 33 has timings for 20 of its 73 ayahs, and surahs 36 and 101 each lack one.

The other 18 reciters cover every ayah. A second audit then checked one long surah (Al-Kahf) of every reciter against its audio: how many ayah starts fall at a pause, and how steady the offset is (reverb shifts every pause by about the same amount, so correct timings stay steady even when pauses are not silent). Two more are out of sync:

- **Yasser ad-Dussary** (174). Ayah offsets scatter (interquartile range 3.8 s; 27% within 1 s of the median), and the timings end 6–8 s after the audio on the surahs checked.
- **Hani ar-Rifai** (5). Proportional drift: 30% of ayah starts fall at a pause as given and 75% once the timings are stretched by 0.1%, about 2 s off by the end of Al-Kahf.

Mishary al-Afasy scores 98% steady. Abdul Basit (mujawwad, 1) is less clear (61% steady; the highlight leads the voice by about 2 s on median), and the developer kept its highlight. The others are steady (83–100%).

The developer decided (3 Nov 2026):

1. Keep the affected reciters (158, 168, 174 and 5), and play them without highlight. Their rows say so with «بدون تتبع». Abdul Basit (mujawwad) keeps its highlight.
2. No audio analysis on the server (no `ffmpeg`).
3. Minshawi (with kids) stays, with no highlight at all.

## Decision

1. **Untrusted reciters (API).** `quran.untrusted_timing_recitations` lists QF chapter reciter ids whose timings are not trusted: 5, 158, 168 and 174. `ChapterRecitationsHandler` never stores their `audio_segment` rows, from a snapshot or a row mutation, and an existing row is removed through the skip path. Their `has_word_segments` is false. Adding a reciter here is how a future mismatch is handled.
2. **One-off cleanup (API).** The migration `drop_untrusted_recitation_timings` deletes the stored timings of the listed reciters. It moves each resource to a new version that is also its `changes_floor_version`, so installed devices replace the whole pack, and dispatches `ResourceContentChanged` to queue the pack build. A reciter with no stored timings is left alone, so running it again changes nothing.
3. **Full coverage (app).** `timingsFor` returns no timings unless the file's surah is known and there is one timing row for each of its ayahs (`chapters.verses_count`). A surah with a missing ayah plays without highlight, instead of stopping partway or landing on the wrong ayah.
4. **Timings must fit the loaded audio (app).** When the player reports the loaded track's duration, `timingsFitAudio` checks the timings against it. They fail when the last ayah ends more than 2 s after the audio, or when more audio follows the last ayah than the larger of 15 s and 5% of the file. On failure the surah plays without highlight or repeat for the rest of the session. Neither threshold rejects any of the 18 matching reciters, and the tail check would have caught Jabir's long surahs.
5. **«بدون تتبع» (app).** On the Listen screen, an installed reciter with no usable timings adds «بدون تتبع» ("No follow-along") to its status line. Timings exist only after the pack is installed, so the label shows from then on. This status-line text is an approved addition to the Listen frame in `quran-app-screens.html`.

## Consequences

- Jabir, Minshawi (with kids), Dussary and ar-Rifai play without highlight or ayah repeat on every surah, until QF publishes timings that match (then the reciter is removed from the list).
- Five ayahs of trusted reciters have no word segments in QF's data (al-Shatri 26 and 37, ar-Rifai 89, ash-Shuraym 12). They get the ayah highlight without the word one.
- Decision 4's 2 s end slack also drops single files whose timings run past their audio, such as Khalifah Al Tunaiji's surah 72 (2.5 s past the end, drifting about 1.7 s late by its last ayahs), while the same reciter's other surahs keep their highlight.
- A reciter added later is checked by decisions 3 and 4 only. Timings that cover every ayah and end with the audio but drift inside the file are not caught without audio analysis, which the developer declined. A spot check like the one above, before a new reciter ships, is the remaining safeguard.
- Decision 4 relies on the duration the player reports, not `chapter_audio_files.duration_ms`. The audit found that column wrong by up to an hour on some files.
- Tests: Pest (handler skips untrusted timings from a snapshot and a row; the migration drops, bumps and queues once) and Jest (`timingsFor` coverage, `timingsFitAudio`, the player dropping the highlight on a mismatch and on replay, and the Listen label in Arabic and English).

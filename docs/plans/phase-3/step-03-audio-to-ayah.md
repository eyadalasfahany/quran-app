# Step 3 — Audio → ayah highlight

Follow [README.md](README.md). Needs step 2.

**Goal:** the recited ayah (and word, when segments exist) is highlighted within 150 ms, and the reader follows it.

- Position tick ~100 ms from the player; binary search over the loaded timings (`startMs ≤ t < endMs`) → `activeVerseId`; inside the ayah, the segment search → `activeWord` (D3).
- Reading (`ReadingAyahRow`), Hafs Mushaf (`HafsMushafPage`) and Focus show the recited ayah with `highlightActive` + the filled brand marker (ADR 0012); a user highlight colour still fills (Phase 2 rule: colour fill + selection/recitation indicators). Word highlight: the word run's background, `timing('fast')`.
- Follow: the list scrolls the active ayah into view while playing unless the reader scrolled away in the last 5 s; the existing "back to the current ayah" pill (`ResumePill`) appears when they did.
- Enable the Play controls: `AUDIO_AVAILABLE` true when a reciter with this surah's audio is available; «تشغيل من هنا» (ayah sheet), the Reading row play, Focus play → `playFromVerse`.
- Tests: the search on fixture timings (boundaries, gaps, last ayah); 150 ms budget with fake timers; active ayah styling in each view (ar/en); follow vs. user scroll.

## Parts (29 Oct 2026)
- **3a, engine (`player.ts`, `playerStore.ts`):**
  - A position update at about 100 ms: the playlist's `updateInterval`; the spike saw 500 ms by default.
  - `activeVerseId` and `activeWord` from the loaded file's timings: a binary search, then the segment search inside the active ayah only (segments can start before their ayah, see `../phase-3.md`). `activeWord` is the segment's word position, 1-based, as QF sends it.
  - New exports: `previousAyah()` and `nextAyah()`, which seek within the surah and cross into the neighbouring surah at its edges.
  - A store `volume` (default 1) that the engine applies to the playlist, the way it applies `speed`. Step 5's sleep fade uses it.
- **3b, reader UI:** the highlight in Reading, Mushaf and Focus; follow-scroll with the resume pill; the play buttons enabled (`AUDIO_AVAILABLE`); previous and next ayah wired in the full player. Starts after 3a.

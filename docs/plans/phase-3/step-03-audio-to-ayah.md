# Step 3 — Audio → ayah highlight

Follow [README.md](README.md). Needs step 2.

**Goal:** the recited ayah (and word, when segments exist) is highlighted within 150 ms, and the reader follows it.

- Position tick ~100 ms from the player; binary search over the loaded timings (`startMs ≤ t < endMs`) → `activeVerseId`; inside the ayah, the segment search → `activeWord` (D3).
- Reading (`ReadingAyahRow`), Hafs Mushaf (`HafsMushafPage`) and Focus show the recited ayah with `highlightActive` + the filled brand marker (ADR 0012); a user highlight colour still fills (Phase 2 rule: colour fill + selection/recitation indicators). Word highlight: the word run's background, `timing('fast')`.
- Follow: the list scrolls the active ayah into view while playing unless the reader scrolled away in the last 5 s; the existing "back to the current ayah" pill (`ResumePill`) appears when they did.
- Enable the Play controls: `AUDIO_AVAILABLE` true when a reciter with this surah's audio is available; «تشغيل من هنا» (ayah sheet), the Reading row play, Focus play → `playFromVerse`.
- Tests: the search on fixture timings (boundaries, gaps, last ayah); 150 ms budget with fake timers; active ayah styling in each view (ar/en); follow vs. user scroll.

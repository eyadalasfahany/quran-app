# Step 8 — Phase 3 exit check (reviewer)

On the iPhone 17 simulator (Phase 2 decision: no real devices), Arabic and English, portrait and landscape:

| # | Check | Expected |
| --- | --- | --- |
| 1 | Play from an ayah in Reading, Mushaf, Focus | Starts at that ayah in < 1 s on a warm stream |
| 2 | Highlight timing on the sample surahs | Active ayah changes within 150 ms of the timing row |
| 3 | Lock the simulator / background the app | Playback continues; lock-screen controls work |
| 4 | Repeat ×3, speed 1.5×, sleep timer end of surah | Each behaves as specified |
| 5 | Download a surah, go offline | It plays from the file; others show the offline state |
| 6 | Mini player, full player, Reciters, Downloads | Identical to their frames (screenshots vs frame-shot) |
| 7 | RTL media rules | Play glyph never flips; progress, times and previous/next mirror between Arabic and English |

Record results in [`../phase-3.md`](../phase-3.md).

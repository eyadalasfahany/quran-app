# Step 5 — Repeat, speed, sleep timer

Follow [README.md](README.md). Needs step 3.

- **Repeat:** a range A–B (default: the current ayah) × N (1, 3, 5, 10, ∞); when `t ≥ B.endMs`, seek to `A.startMs` until N is reached, then continue. The Focus transport «٣×» and the player's repeat control set it; the label reads «{n}×».
- **Speed:** 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2× (`expo-audio` rate, pitch kept).
- **Sleep timer:** end of ayah, end of surah, 15/30/60 min; the volume fades out over 3 s, then playback pauses.
- All in `playerStore`; survives backgrounding.
- Tests with fake timers for each mode and the repeat boundary.

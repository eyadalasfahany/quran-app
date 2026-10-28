# Step 4 — Mini player and full player

Follow [README.md](README.md). Needs steps 2–3.

- **Mini player** identical to the frames: the reader's bottom bar in `Reading`/`Focus` and Home's «آخر ما استمعت إليه» card in `Main` (glass bar, reciter initial tile, reciter + «الفاتحة · الآية ٣», play/pause, the gold progress line filling from the right). Hidden when nothing has played.
- **`recent_listens`** in `user.db` (spec §6): written on pause, surah end and every 15 s of playback; Home reads the latest.
- **Full player** = the `Player` frame: artwork/tile, reciter and surah, progress with elapsed (right) and remaining (left), transport (previous ayah, play/pause, next ayah — next on the left with its glyph flipped), speed, repeat, sleep timer, reciter switch. Presented the way the frame shows (sheet or screen — read the frame).
- Components in `src/features/audio/components/`, each with its test; screens compose.

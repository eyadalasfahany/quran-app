# Step 4 — Mini player and full player

Follow [README.md](README.md). Needs steps 2–3.

- **Mini player** identical to the frames: the reader's bottom bar in `Reading`/`Focus` and Home's «آخر ما استمعت إليه» card in `Main` (glass bar, reciter initial tile, reciter + «الفاتحة · الآية ٣», play/pause, the gold progress line filling from the right). Hidden when nothing has played.
- **`recent_listens`** in `user.db` (spec §6): written on pause, surah end and every 15 s of playback; Home reads the latest.
- **Full player** = the `Player` frame: artwork/tile, reciter and surah, progress with elapsed (right) and remaining (left), transport (previous ayah, play/pause, next ayah — next on the left with its glyph flipped), speed, repeat, sleep timer, reciter switch. Presented the way the frame shows (sheet or screen — read the frame).
- Components in `src/features/audio/components/`, each with its test; screens compose.

## Parts (29 Oct 2026)

The developer asked for the player UI before step 3 lands. The UI reads `playerStore` only, so it doesn't depend on the player engine (single `AudioPlayer` today, `AudioPlaylist` next). Each part goes to the implementer on its own, and the reviewer checks it before the next one starts.

### 4a: full player screen (`#Player`)
- **Route:** `app/player.tsx`, a full-screen modal (`presentation: 'fullScreenModal'`, slide from the bottom). «تصغير المشغّل» (chevron down) closes it. The frame is a dark screen in every app theme: it uses the `player*` tokens (`playerBg`, `playerInk`, `playerMuted`, `playerAccent`, `playerLine`) and `goldOnBrandSurface` for the bar fill and the play button. It never uses `surface` or `ink`.
- **Layout from the frame** (390 × 844): column, gap 20, padding 52/24/30 (top under the safe area).
  1. Header: minimize (44), «يُتلى الآن» 13/500 `playerMuted`, «المزيد» (44, disabled until a later step).
  2. `ReciterArtwork`: 220 × 220, radius 32, `brandSurface`, the reciter's first letter in Amiri 96/700 `playerAccent`, plus the frame's ornament. D4: no photos.
  3. `NowPlayingTitle`: reciter 22/700, surah «سورة الفاتحة» 15 `playerMuted`, the style pill («مرتّل», 12/600 `playerAccent`, `playerLine` border, radius 10, padding 1/8).
  4. `NowPlayingAyah`: a card (radius 20, `playerLine` border, padding 14/16). The ayah in Amiri Quran 25 with line height 2.1, centred. Words already recited are `playerInk`, the current word is `playerAccent`, and words still to come are `playerMuted`. Under it, «الآية ٥ من ٧» 12 `playerMuted`. It renders only when `activeVerseId` is set (step 3), so until then the card is hidden. The Quran text is byte for byte from `content.db` and is never truncated.
  5. `PlayerProgress`: track 4 high, radius 2, `playerLine`. The fill is `goldOnBrandSurface` and grows from the start edge: the right in Arabic, the left in English. Times are 12 `playerMuted`: elapsed at the start edge, the file's total at the end edge, always shown once the duration is known (`٠:٠٠` before that) (the frame shows the total, «٠:٤٨», which wins over "remaining" in this brief, ADR 0013). Digits go through `formatNumber`. Draggable seek, with `accessibilityRole="adjustable"` and increment and decrement of 10 s.
  6. `PlayerTransport`: previous ayah (52), play/pause (76, radius 38, `goldOnBrandSurface` fill, `playerBg` glyph), next ayah (52). The row mirrors with the layout: in Arabic next ayah sits on the left and previous on the right, as the frame draws; in English they swap. Their glyphs flip with the direction, and the play/pause glyph never flips (developer, 29 Oct 2026). Until step 3, previous and next ayah are disabled.
  7. `PlayerOptionsBar`: the bottom glass group (radius 28, padding 6, 4 equal columns, gap 4) with «تكرار ٣×», «الآيات ١–٧», «السرعة ١×» and «مؤقت النوم»: icon over a 12 pt label. The active item (repeat in the frame) is `playerAccent` 600, the others `playerInk` 500. Until step 5 every item is disabled and shows its default label («تكرار»; the range of the current surah; «السرعة ١×»; «مؤقت النوم»).
- **Wiring:** play/pause calls `pause()`/`resume()`, and seek calls `seek(ms)`. Names come from `listReciters` (`nameAr` in Arabic, `name` in English) and `getChapter`, and the style from `recitations.style` once installed. When `status` is `error`, the transport shows play, and an inline message from new i18n keys per `PlayerErrorCode` replaces the ayah card.
- **Components** in `src/features/audio/components/`, each with its colocated test (render, every state, presses, ar/en RTL, a11y labels from the frame, no hex). The screen in `src/features/audio/screens/PlayerScreen.tsx` only composes them.

### 4b: mini player (`#Reading`, `#Main`)
The glass bar from the frames, hidden while `status` is `idle`. Reader: bottom 28, height 68, radius 20. Home: above the tab bar, height 64. Reciter tile (46 or 44, radius 12 or 14, `fillSecondary`, Amiri initial), reciter 15/600 or 17/600, «الفاتحة · الآية ٣» muted, play/pause (44, `brand`), and the 3 pt `gold` progress line at the top, filling from the start edge (the right in Arabic). A tap opens `/player`. Brief written after 4a's review.

### 4c: `recent_listens` and Home's «آخر ما استمعت إليه»
Touches the `user.db` schema (spec §6), so it's planned and approved before code.

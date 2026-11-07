# reading

Index, search, reading/focus modes, tafsir

11 frames · open in viewer: `viewer.html?id=<FrameId>`

| id | size | theme | status | caption |
|---|---|---|---|---|
| `SurahIndex` | compact | ar-light | source | Surah index |
| `Search` | compact | ar-light | source | Search |
| `Reading` | compact | ar-light | source | Reading mode |
| `ReadingMiniIdle` | compact | ar-light | source | Reading · mini player idle (plays from the top ayah on screen) |
| `ReadingMiniCollapsed` | compact | ar-light | source | Reading · mini player collapsed (drag down to hide, drag up or tap to show) |
| `ReadingMiniUnavailable` | compact | ar-light | source | Reading · mini player, surah unavailable for the reciter (surah 37 الصافات with إسلام صبحي; play was pressed, nothing plays, no progress state). Info glyph and message; «تغيير القارئ» opens the reciter picker (44 pt target). Idle reader rule (ADR 0059) so the bar stays on the reader. Approved 4 Nov 2026 (ADR 0062) |
| `ReadingMiniSkipped` | compact | ar-light | source | Mini player, playing · continuous play skipped surah 37 (moved 36 → 38). Shows surah ص playing normally, plus a secondary line «تخطّي الصافات · غير متوفرة بصوت إسلام صبحي». The notice is transient: it shows for about 4 s, then the line disappears. VoiceOver announces it (role=status, polite). Approved 4 Nov 2026 (ADR 0062) |
| `Focus` | compact | ar-light | source | Focus mode |
| `Tafsir` | compact | ar-light | source | Tafsir · mid detent (50%) |
| `TafsirFull` | compact | ar-light | source | Tafsir · full detent |
| `TafsirDownload` | compact | ar-light | source | Tafsir · not downloaded · mid detent (50%) |

## Model rule
Read this file only. Open `frames/reading/<id>.html` only for visual/HTML review of one frame.

# Phase 3 — Listening and audio

Spec §15. **Exit criterion:** ayah highlight within 150 ms of the timings on the sample surahs; playback continues with the screen locked; repeat, speed and sleep timer work; a downloaded surah plays offline. Checked on the iPhone 17 simulator (no real devices, as Phase 2).

**Design sources** (ADR 0010, 0013): frames `Player`, `Reciters`, the mini player in `Reading` and `Main` («آخر ما استمعت إليه»), the Focus transport (`Focus`), `Downloads` (recitations card), the listening section of `Settings`, `OnboardReciter` (later). Identical to the frames unless the developer approves a difference.

**Rules:** `docs/plans/phase-3/README.md` (same as Phase 2, plus audio rules). Implementation by Haiku subagents; small briefs, one concern each.

## What exists
- **API:** the Content Sync `chapter_recitations` group, MySQL `recitations`, `chapter_audio_files` (QF's audio URLs, ADR 0008) and `recitation_timings`; packs built per recitation (prelive: Afasy 24 with 6,351 timing rows; Husary 23 listed). No extra endpoint is needed: reciters reach the device through the manifest and packs.
- **Device:** the `chapter_recitations` pack group imports `recitations`, `chapter_audio_files` and `recitation_timings` into `content.db`. Play controls are drawn but disabled (`AUDIO_AVAILABLE` in `src/features/reader/audio.ts`).
- **Not there:** `expo-audio` (content plan pins ~58.0.10), background audio mode, the player store, any player UI.

## Decisions (developer, 28 Oct 2026: D1, D2 and D4 accepted as recommended; D3 follows the data)
| # | Question | Decision |
| --- | --- | --- |
| D1 | Stream or download by default? | **Stream** from the QF audio URL; download per surah on demand (Wi-Fi only by default). |
| D2 | Default reciter | **Mishari al-Afasy** (has timings in prelive); the reader can change it. |
| D3 | Word-level highlight | Only where QF sends word segments; ayah-level otherwise (spec §12). |
| D4 | Lock-screen artwork | The app icon until reciter photos are licensed. |

## Steps
| # | Step | Contents | Needs |
| --- | --- | --- | --- |
| 1 | **Audio data on the device** | Repositories over `content.db`: reciters (from `catalog_resources` group `chapter_recitations` + installed recitation packs), chapter audio file per recitation and surah, timings for a file (≤ 286 rows). Download a recitation pack on demand (step 13's `installResource`). | — |
| 2 | **Player core** | `npx expo install expo-audio`; background audio (`UIBackgroundModes: audio`, native rebuild); `playerStore` (Zustand): queue = one file per surah, reciter, state, position, speed; lock-screen metadata and remote controls; end of surah → next surah; resume last position. | 1 |
| 3 | **Audio → ayah** | Position tick ~100 ms; binary search in the file's timings → active verse id in `playerStore`; Reading, Mushaf and Focus show the active ayah (`highlightActive` + filled marker, ADR 0012) and follow it while playing; word highlight when segments exist. Enables the disabled Play controls («تشغيل من هنا», Reading row play, Focus play). | 2 |
| 4 | **Mini player and full player** | Mini player in the reader and on Home («آخر ما استمعت إليه», `recent_listens` in `user.db`); full `Player` screen as framed (progress fills from the right, ADR 0012). | 2, 3 |
| 5 | **Repeat, speed, sleep timer** | A–B range × N, speed 0.5×–2×, sleep timer (end of ayah, end of surah, 15/30/60 min); Focus transport «٣×» wired. | 3 |
| 6 | **Reciters** | `Reciters` screen: list, choose the default, download state per reciter. | 1, 2 |
| 7 | **Audio downloads** | Per-surah file download with progress and resume, Wi-Fi-only setting, offline playback; the `Downloads` screen recitations card with `DownloadRow` (shared with step 13). | 2, step 13 |
| 8 | **Exit check** | Simulator: 150 ms highlight on the sample surahs, locked-screen playback, repeat/speed/sleep, offline surah. | all |

**Waves:** A: 1. B: 2. C: 3, 6, 7 (parallel). D: 4, 5. E: 8.

## Prelive data (checked 29 Oct 2026, `qf-audio-shapes`)
- **Ids:** Afasy murattal is QF chapter reciter 7 (our resource 24, `recitations.id` 2); Husary murattal is 6 (resource 23, `recitations.id` 1). Both have 114 files and 6,236 timing rows, all with segments; surah 2 has no overlapping or empty ranges for either.
- **Manifest:** only Afasy is served; Husary has no pack yet. A recitation's `name_ar` is null in the manifest although `recitations.reciter_name_ar` holds «مشاري راشد العفاسي» (`servedArabicName` covers tafsirs only).
- **`duration_ms` is whole seconds and can be shorter than the last ayah** (Afasy 1: 46,000 against a last `end_ms` of 46,490). The player takes the duration from the loaded file, not from the row.
- **`size_bytes` units differ by reciter:** QF sends Husary's `file_size` as 371.65 (KB) and Afasy's as 839,808 (bytes). Download sizes (step 7) come from the response's `Content-Length`, not from the row.
- **Segments:** QF sends stray one-element entries (Afasy 1:3) and floats (Husary); the API drops the stubs and rounds the floats, so the device sees clean `[position, start, end]` triples. Word segments can start a little before their ayah's `start_ms` (Afasy 1:2: 6,025 against 6,090), so word lookup searches inside the active ayah only.

## Known limits
- Prelive has 2 reciters (Afasy with timings, Husary). The full catalogue needs QF production keys.
- Audio files are QF content: streamed from the URLs QF returns, never repackaged by our API (ADR 0008).

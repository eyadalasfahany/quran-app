# 0055 — Audio rules for 99 Names, Duas and Azkar/Hisn

Date: 2026-11-03 · Status: **accepted (developer, 3 Nov 2026)** · Cites ADR 0008 (QF audio and Quran player), ADR 0040 (Azkar audio, Taybah-hosted), ADR 0043 (99 Names decision 12 and audio note), ADR 0044-duas (Quranic audio amendment, decisions 6–7 and 19), ADR 0047 (Azkar player: queue, seek, sleep timer) · Does not amend any existing ADR; records what each feature does and does not play.

## Context

ADR 0043 (99 Names) and ADR 0044-duas (Duas) were both accepted on 3 Nov 2026. Neither original ADR settled audio; the developer gave audio rules in the same session. This ADR records them as a single written source so the implementers do not have to infer them from two feature ADRs and two player ADRs.

The five features covered:

| Feature | ADR |
| --- | --- |
| Azkar / Hisn al-Muslim (Hisn topics in Duas) | 0031, 0038, 0040, 0047 |
| Quranic duas | 0044-duas §2, this ADR §2 |
| Prophetic duas (HadeethEnc) | 0044-duas §3, this ADR §3 |
| «أدعيتي» (user's own duas) | 0044-duas §5, this ADR §4 |
| 99 Names of Allah | 0043 A7, this ADR §5 |

## Decision

### 1. Azkar and Hisn al-Muslim: unchanged

Azkar audio is governed by ADR 0040 (files hosted by Taybah, OpenDua archive, Muhammad Jumah recitation, CC-adjacent public invitation) and ADR 0047 (queue, repetition, seek, sleep timer, `azkarPlayerStore`). Nothing here changes those rules.

The Duas section's «حصن المسلم» view (ADR 0044-duas §4) is a view of the existing Azkar entries by topic. It does **not** create a second audio player, duplicate any recording or add any audio file. The Azkar reader, counter, player bar and `azkarPlayerStore` are reused without modification. A Hisn entry opened from the Duas home plays exactly as it would from the Azkar home.

### 2. Quranic duas

**No separate audio clips are created, fetched, stored or served for Quranic dua spans.**

The Quranic dua detail screen (`DuaQuranDetail`) shows a single pill «فتح في المصحف». Tapping it navigates to the Mushaf reader at the span's `verse_from`. Once in the reader, the user may tap «play from here» (ADR 0037 §3–4) to play the verse. This flow uses the Quran `playerStore` (spec §12; ADR 0046) and the QF audio CDN (ADR 0008 §3). It does **not** write to or read from `azkarPlayerStore`.

Ayah timing rows (spec §12 "Audio → ayah") are shown in the reader only when they are already present for that surah's recitation. No timing data is fetched or generated for Duas.

A dedicated verse-range play button inside `DuaQuranDetail` is a **cut line**. It is not built in v1. If the reader gains a programmatic «play from here» API in a future phase, this can be revisited; at that point it will still use the Quran `playerStore` and QF audio, never `azkarPlayerStore` or a Taybah-hosted clip.

### 3. Prophetic duas (HadeethEnc)

**No audio in v1.** No play button, no clip, no TTS. The detail screen (`DuaHadithDetail`) is text-only: the Arabic matn, the attribution, the explanation and the link rows.

Rationale: HadeethEnc does not publish audio. Scraping audio is prohibited (non-negotiable 6 applies to all religious content, and no verified source exists). TTS is not used for religious text.

A future phase may add HadeethEnc audio if HadeethEnc publishes a licensed audio source; at that point a new ADR governs it.

### 4. «أدعيتي» (user's own duas)

**No audio, ever.** The user's personal duas are text they compose themselves. No playback, no TTS, no recording feature.

### 5. 99 Names of Allah

**No audio in v1.** The `NamesListScreen` and `NameDetailScreen` have no play button, no audio control and no speaker glyph.

Licensing is the same obstacle as ADR 0043 F1: no dataset with a clear licence was found, and the same problem applies to audio recordings of the names. Commissioned or licensed recitations do not yet exist; TTS is not used for the Names (non-negotiable 6); YouTube or third-party audio scraping is not used.

A follow-up is warranted when a licensed or commissioned recitation of all 99 names exists. At that point:
- Hosting mirrors ADR 0040 (Taybah-controlled storage, not CDN-streamed from the rights holder's domain).
- The audio `rightsProfile` and attribution are recorded in `content_sources` and shown to the user, as Azkar audio does.
- A new ADR addendum records the source, the licence terms and the hosting decision before any file is imported.
- The player uses `azkarPlayerStore` (not the Quran `playerStore`), with the same queue-and-repetition model as Azkar (ADR 0047), because the Names player is a counter-style player, not a Mushaf-position player.

Until that follow-up ADR is written and accepted, no audio is built, imported or shipped for the Names.

## Summary table

| Feature | v1 audio | Store used | Cut line / follow-up |
| --- | --- | --- | --- |
| Azkar / Hisn in Duas | ✅ unchanged (ADR 0040, 0047) | `azkarPlayerStore` | — |
| Quranic duas | «فتح في المصحف» → reader «play from here» | `playerStore` (Quran) | Verse-range button in reader |
| Prophetic duas | ❌ none | — | New ADR if HadeethEnc adds audio |
| «أدعيتي» | ❌ none, ever | — | — |
| 99 Names | ❌ none | — | New ADR addendum when licensed recitation exists |

## Consequences

- No new audio pipeline, no new file storage, no new CDN integration in v1.
- `azkarPlayerStore` is **not** imported by any Duas or Names component (enforceable by an architecture test: nothing in `features/duas` or `features/names` imports `azkarPlayerStore`).
- The Quran `playerStore` is **not** imported by any Azkar or Duas component directly; Duas routes to the reader screen, which owns the store.
- The Quranic dua «فتح في المصحف» pill is a navigation action, not a playback action; its test asserts a route push to `/read/<verse_key>`, not an audio command.
- The HadeethEnc terms say "no modification, addition, or deletion of the content" (ADR 0044-duas §2). Omitting audio is not a modification of stored text; this ADR does not conflict with those terms.

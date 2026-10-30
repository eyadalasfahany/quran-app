# 0028 — One bookmark for khatma, and playback owns continue reading

Date: 2026-10-30 · Status: accepted · Amends ADR 0023 and spec §12

## Context

Bookmarks were a list, one live mark per ayah. Khatma needs a single place in the mushaf. The continue-reading card followed the reader’s scroll, and opening a surah while audio played landed on the ayah being recited.

## Decision

1. **One bookmark.** Tapping bookmark on an ayah replaces any other live bookmark. Tapping the same ayah again removes it. The bookmark moves only from that control. Khatma progress is calculated from this ayah.
2. **Listening owns continue reading.** While an ayah is playing or loading, `reader.lastVerseKey` is that ayah. Scrolling the reader does not move it until playback stops.
3. **Opening a surah shows that surah.** If the opened ayah is not the one being recited, the reader stays there. «العودة إلى الآية الحالية» is what jumps to the recitation. Audio keeps playing.

## Consequences

- Highlights and notes stay as lists.
- The home card and the index continue-reading row follow playback even when the reader is closed or showing another surah.

# Step 5 — Mushaf mode with QCF V2 page fonts (App)

**Status: done** (27 Oct 2026). In the working tree, not committed. Do not reimplement. Only `MushafList` sets the font viewport, from the visible page. Do not put QCF glyph bytes in an accessibility label.

Follow [README.md](README.md). Needs steps 1 and 2 committed. Read also:
- [ADR 0011](../../adr/0011-phase-2-fonts-and-local-user-data.md), D1, and its font terms.
- Spec §4 ("Mushaf page sizing") and spec §12 ("Mushaf rendering", "Ayah hit-testing").
- The `Mushaf page` phone frame and `#tablet-reader` frames in `quran-app-screens.html`.
- The step 2 `getMushafPage`.

**Goal:** page-exact Mushaf mode. 604 pages, 15 lines each, from the synced QF layout (`mushaf_id` 1, QCF V2), in each page's own font.

## Page fonts (`src/features/reader/mushaf/fonts.ts`)

- **URL:** `https://verses.quran.foundation/fonts/quran/hafs/v2/ttf/p{page}.ttf`, a public QF CDN (ADR 0011).
  - **Only this host.** Never route these through our API.
  - **No credentials:** don't send `x-auth-token` or `x-client-id`.
- **`ensurePageFont(page)`:**
  - Download with `expo-file-system` to `documentDirectory/qcf-v2/p{page}.ttf` if missing, storing `ETag` and `Last-Modified` in MMKV.
  - Load with `expo-font` as family `qcf-v2-p{page}`.
  - Concurrent calls for the same page share one promise.
- **Window:** prefetch pages within ±2 of the viewport, and release loaded fonts more than 10 pages away (spec §12). Files stay on disk.
- **`revalidatePageFonts()`:** when online, at most once every 30 days per file, send a conditional GET (`If-None-Match` / `If-Modified-Since`). On 200 replace the file; on 304 just update the timestamp.
- **`downloadAllPageFonts(onProgress)`:** the optional offline action, run in the background, resumable, and cancellable. The Settings UI for it comes later; expose the function and a hook now.
- **Offline or failed font:** the page shows a calm placeholder ("Connect to load this page"), with a button to switch to Reading mode at the same ayah. Never a broken glyph page.

## Components (`src/features/reader/components/`, each with its own test)

| Component | Content |
| --- | --- |
| `MushafLine` | One line of word glyphs from `word_layouts` (`glyph` **byte for byte**) in the page's font family. Each word is a nested `Text` with `onPress` and `onLongPress` resolving to its `verse_id` (spec §12). Highlights: a user colour is a background span on the nested `Text`. **The selected or recited ayah** is the neutral `highlightActive` wash plus a **brand margin rule beside each of its lines**. The QCF ayah-marker glyph is **never recoloured** (ADR 0012) |
| `MushafPage` | 15 line slots. Lines with no words are header slots: render `SurahCartouche` when the next surah starts there, and `BismillahLine` on the following empty slot when that surah has `bismillah_pre`. Page width = `min(window − gutters, MUSHAF_PAGE_MAX)` (640). Font size is derived from the width so a page never rewraps (spec §4). The page frame (double gold border) follows the design |
| `MushafPagePlaceholder` | The offline or failed state above |

## The list (`src/features/reader/MushafList.tsx`)

- **FlashList** of 604 pages with `overrideItemLayout`: page height is exact for a given width (spec §12), so jumping to an ayah lands without measuring.
- **Anchor:** the current page, and the first ayah on it, go to `useReadingAnchor`. Switching between Mushaf and Reading keeps the ayah (`pageForVerse`, `firstVerseOfPage`).
- **Missing layout:** a page whose layout isn't installed (prelive has only 2 surahs) shows the placeholder, with "Read in Reading mode".

## Credit

Add the i18n strings and the Sources entry for **"Quran fonts provided by Quran Foundation"** (ar and en). The Settings → Sources screen lists it; build a minimal list row if that screen doesn't exist yet.

## Tests

- **Fonts:** `expo-file-system` and `expo-font` are mocked.
  - The URL is built for pages 1 and 604, and the host is asserted.
  - A second call doesn't download again.
  - The ±2 and 10 window.
  - Revalidation sends conditional headers and is skipped within 30 days.
  - The placeholder appears on a failed download.
- **`MushafPage`**, from a fixture layout of pages 1 and 2:
  - 15 slots.
  - The cartouche on surah starts.
  - Glyph text byte-exact.
  - A press resolves to the right `verse_id`.
  - Width capped at 640, with font size derived.
- **The list:** jump to `2:255` scrolls to its page index. Page ↔ verse round trip.

## Reviewer check (not for the agent)

On an iPad and a phone, pages 1–3 render from the real prelive layout with real QF fonts. Airplane mode after visiting a page still renders it. A never-visited page shows the placeholder.

## Leave untouched

The API, the content sync, Reading mode, and the tokens.

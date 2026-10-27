# Step 2 — Reader data layer (App)

**Status: done** (27 Oct 2026, committed in `05b931e`). Do not reimplement. `useReadingAnchor()` takes no route argument. A route key wins only when it matches `^[1-9]\d*:[1-9]\d*$` after trim, and then `page` is null.

Follow [README.md](README.md). Needs Phase 1 committed: `content.db` with Tanzil verses, `words` and Basmala (step 11), and the pack tables. Read also:
- Spec §4 ("Where state lives") and spec §12.
- `apps/mobile/src/core/db/content/*`.

**Goal:** typed repositories the reader reads from, plus the reading-position anchor. **No UI.**

## Repositories (`src/features/reader/data/`)

Each is a set of functions over `SqlExecutor`, so they're testable with the `node:sqlite` executor.

| File | Functions |
| --- | --- |
| `chapters.ts` | `listChapters()`, `getChapter(id)` (including `bismillah_text`) |
| `verses.ts` | `getVersesBySurah(chapterId)`, `getVersesByPage(page)`, `getVerseRange(fromId, toId)`, `getVerseByKey(key)`, `verseKeyToId(key)` / `idToVerseKey(id)` |
| `words.ts` | `getWords(verseId)` (Uthmani and Imla'i per position, plus `end` rows) |
| `mushaf.ts` | `getMushafPage(mushafId, page)`: lines grouped by `line`, words ordered by `position_in_line`, each with `glyph`, `verse_id`, `char_type`. `isPageInstalled(mushafId, page)` |
| `translations.ts` | `getTranslations(verseIds, resourceIds)`, `listInstalledTranslations()` |
| `tafsir.ts` | `getTafsirForVerse(resourceId, verseId)`: the entry whose range covers the verse. `listInstalledTafsirs()` |

**Rules:**
- **Returned text** is exactly what's stored. Nothing is trimmed or reshaped.
- **Queries:** every query is prepared with parameters. `getVersesByPage` and `getMushafPage` use the indexes from Phase 1 (assert with `EXPLAIN QUERY PLAN` in a test).

## Reading anchor (`src/features/reader/anchor/`)

- **`useReadingAnchor()`** keeps the top visible `verse_key` (and the page in Mushaf mode) in the MMKV keys `reader.lastVerseKey`, `reader.lastPage` and `reader.mode`. Writes are throttled to once a second. Add the keys to `storageKeys`.
- **`resolveInitialAnchor(params)`**, in priority order: a route `verseKey` param, then the last-read anchor, then `1:1`.
- **`pageForVerse(verseKey)`** and **`firstVerseOfPage(page)`**, so switching mode keeps position.

## Tests

`node:sqlite` against a test `content.db`. Build it from the Phase 1 seed and a small translation, tafsir and mushaf pack fixture in the shared-contract shape.
- Every repository function, including the edges:
  - Surah 1 and surah 9 (no Basmala).
  - A tafsir entry covering a verse range.
  - A page with a surah boundary.
- **Byte-exact:** text equality on 2:255.
- **Anchor:** the priority order, throttling (fake timers), and the page ↔ verse round trip for pages 1, 2, 50 and 604.

## Leave untouched

The Phase 1 sync code, the schema (report any query that needs a new index rather than adding one), and the UI.

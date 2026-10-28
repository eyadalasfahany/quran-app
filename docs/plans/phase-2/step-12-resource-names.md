# Step 12 — Resource names on the device

Follow [README.md](README.md). Needs step 11's tafsir panel. Touches the `content.db` schema and sync, so the developer approves this plan before code.

**Goal:** the tafsir chips, the name row and the source credit show the real tafsir name and author, as the `#Tafsir` and `#ReaderExpandedTafsir` frames draw them. Today they fall back to «تفسير {id}», and the credit reads «المصدر: تفسير 16 · عبر Quran Foundation».

**What exists:** `GET /content/manifest` already sends `name`, `author_name`, `language_code` and `direction` for every resource. `installed_resources` keeps only `resource_id`, `group`, `version`, `sha256`, `last_checked_at` and `change_cursor`.

## Changes
1. **`content.db` migration 0004:** add nullable `name`, `author_name`, `language_code` and `direction` (`'rtl' | 'ltr'`) to `installed_resources`. Generated with drizzle-kit; old migrations untouched. `content.db` can be rebuilt, so nullable columns and a backfill on the next sync are enough.
2. **Sync (`core/sync/content-sync.ts`):** when a resource is installed or its manifest entry is seen again, write the four fields from the manifest. A manifest whose name changed updates the row without a pack download.
3. **Reader data (`features/reader/data/tafsir.ts`, `panels/panel-data.ts`):** read the fields; `loadTafsirOptions` returns `name`, `authorName` and `direction`. The «تفسير {id}» fallback stays for rows not yet backfilled.
4. **UI:** the chips and name row use `name`; the source credit uses `author_name` («المصدر: {author} · عبر Quran Foundation»); the tafsir body sets its writing direction from `direction`.
5. **Tests (spec §14):** migration adds the columns; sync writes and updates them; an old row with nulls shows the fallback; the panel shows the name and the credit.

**Approved** by the developer on 28 Oct 2026.

## Arabic names (added 28 Oct 2026, the developer's request)
QF's `name` is English. QF returns an Arabic name in `translated_name` when the catalogue is requested with `?language=ar`, for the Arabic tafsirs and a few others (e.g. 170 Al-Sa'di → «تفسير السعدي»). Some arrive with quirks: Persian letters («تفسیر ابنِ کثیر», id 14), tatweel («الـتـفـسـيـر الـوسـيـط», id 93), a trailing U+200E (ids 90, 94).
- **API:** `resources.name_ar` (nullable). The catalogue sync calls the tafsir catalogue a second time with `?language=ar` and stores `translated_name.name` when its `language_name` is `arabic`, as received. `config/quran.php` keeps a small `display_names.ar` override map (resource source id → clean Arabic name) for the quirks above; overrides win. Names are not Quran text, so the override is allowed (non-negotiable #1 covers Quran text only).
- **Manifest:** sends `name_ar`. OpenAPI and `schema.d.ts` regenerated.
- **Device:** migration 0004 also adds `name_ar`. The UI shows `name_ar` in Arabic, `name` in English, falling back to the other, then to «تفسير {id}».
- **Data:** prelive has 6 tafsirs (1 Arabic: Jalalayn); production has 20 (7 Arabic). Production keys are needed for the full set. Tafsir text is Arabic only (ADR 0015).
- **Status (28 Oct 2026):** no QF production keys yet. Built and tested on prelive (Jalalayn only). When the keys arrive: set `QF_ENV=production` and the keys in `apps/api/.env`, run the catalogue sync and `content:sync tafsirs`, then `content:build-pack` for each Arabic tafsir.

## Length tags: removed
The frames drew a length tag on each chip («مختصر», «متوسط», «مفصّل»). The developer decided that a chip shows the tafsir's title only («التفسير الميسر», «ابن كثير», «السعدي»), from `name`. The tags are removed from `quran-app-screens.html`, and the app drops `lengthTag`.

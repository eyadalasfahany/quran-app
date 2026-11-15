# Duas gets all duas; Azkar keeps dhikr — plan

Date: 15 Nov 2026 · Status: **proposed** (waits for the developer on the decisions in §3 and the frames in §6) · Branch: `main` unless the developer names one · ADR draft: `docs/adr/0091-duas-get-all-duas.md` · Permission requests: `docs/permission-requests/duas-sources.md`.

## 1. What the developer decided (15 Nov 2026)

1. Every Hisn al-Muslim entry gets a type, `dhikr` or `dua`. Entries in the five timed sessions stay whole in Azkar. Outside them, a `dua` entry moves from its Azkar browse topic to Duas; a `dhikr` entry stays.
2. Claude proposes the types in a review sheet; only the developer marks a row `reviewed`; production uses `reviewed` rows only; an unreviewed entry stays where it is.
3. Duas becomes a single page like Azkar: home of categories, category pages, reader. It is categorised: Hisn duas, HadeethEnc prophetic duas, Quranic duas, «أدعيتي».
4. Only licensed sources now (Hisn through OpenDua, HadeethEnc, the Quran). Permission requests for others are drafted, not used.
5. Quran text never altered, no generated religious content, user data survives, no native change.

## 2. Rests on (read for this plan)

- `CLAUDE.md` (non-negotiables 1, 3, 4, 6, 7; «Releasing the app»), `.claude/agent-rules.md`.
- Spec §5 (MySQL), §6 (device SQLite; `content.db` additive migrations; `user.db` additive only), §7 (pack and import pipeline; Azkar import, fingerprint, no switches), §11 (user data; v1 is local-only, ADR 0027, so the sync cases do not apply but their intent, stable keys and no loss, does), §12 (reader, search), §14 (test layers and device matrix).
- ADR 0031 (§4 Quran segments, §9 data ownership and display categories, §10 placement, §11 reviewed-rows rule), ADR 0044-duas and its amendments of 5 and 15 Nov 2026, ADR 0055 (audio), ADR 0090 (proposed; Quls back, Duas without Azkar), ADR 0087 (design flow), ADR 0089 (Home by daily use).
- Code read: `apps/api/config/azkar.php` (`session_categories`, `excluded_entries`), `config/duas.php`, `config/azkar_quran_map.php` (the pattern), `app/Domains/Azkar/Services/AzkarTransformer.php` (`categories()`, `entry_type` is OpenDua's `invocation|instruction|narration`, a different field), `AzkarImportFingerprint.php`, `app/Domains/Duas/Services/DuasImportPlanner.php`, `HadeethEncDuasGroupBuilder.php`, `app/Domains/Content/Packs/PackSchema.php` (`VERSION = 1`, `azkarEntries()`, `duaItems()`, `duaGroups()`), `PackBuilder.php`, `apps/mobile/src/core/sync/content-sync.ts` (`packSelectList`, `assertPackMeta`), `core/sync/content-tables.ts`, `core/db/content/schema.ts` and `migrations/0011_duas_tables.sql`, `core/db/user/schema.ts` (`azkar_favorites.entry_key`, `azkar_progress.scope_key|item_key`, `azkar_reminders`, `dua_favorites.dua_key`), `features/azkar/data/content-repository.ts` (`listCategoryEntries`), `features/azkar/data/category-cards.ts`, `features/azkar/routes.ts`, `features/duas/routes.ts`, `features/duas/data/*`, `app/azkar/*`, `app/duas/*`.
- Not found: `DUAS-HISN-AND-CORPUS.md`, which ADR 0090 and the frame captions cite. It is not in the repo, so the §7 list it holds could not be read. And `docs/plans/azkar-duas-split/classification.md` did not exist when this plan was written (the developer says it is being drafted).

## 3. Decisions (answered by the developer, 15 Nov 2026)

**Answers:**

- **D1 = A:** sourced names only, so step 12 is dropped.
- **D2:** as recommended.
- **D3: keep all 132 chapters in Azkar** (ADR 0031 §9). A chapter whose entries all moved still opens its duas. This replaces the recommendation in the table below. Step 8 (a Duas by-chapter list) becomes a cut line.
- **D4 = yes:** Duas favourites also show saved Hisn duas.
- **D5 = yes:** Hisn duas open in the Azkar reader.
- **D6, D7, D8:** as recommended. Search comes later.

Classification sheet: `docs/plans/azkar-duas-split/classification.md`. 97 proposed duas would move; every row is still a candidate.

| # | Decision | Recommendation (for the developer to accept or change) |
| --- | --- | --- |
| D1 | **Category names on Duas.** (A) Sourced: Hisn topics (the 19 OpenDua tags, ADR 0031 §9), HadeethEnc's two group titles as received, one Quranic category in Mushaf order, «أدعيتي». (B) A Taybah list that mixes Quran, Hisn and HadeethEnc, as the pending frames draw it («المغفرة والتوبة», «الهداية والثبات», «جوامع الدعاء»…). The frame names match no source; ADR 0044 §2 says «no themes… we do not author them». B is a religious classification of Quran verses and hadith. | A first (steps 1–9). B only after an ADR amendment and a reviewed sheet for every verse and hadith (step 12, cut line). The frames must then be redrawn for A or the developer approves B in writing. |
| D2 | **Entry in a session and in a browse topic.** | Stays whole in Azkar, in both (no duplicate in Duas). |
| D3 | **Azkar chapter list** (pending frame `AzkarChapters`): hide a chapter whose entries all moved, or keep all 132 (ADR 0031 §9). | Show a chapter only if it has an Azkar entry; Duas gets the same by-chapter list (step 8). |
| D4 | **Duas favourites** include saved Hisn duas (read-only union). Azkar favourites keep showing them too. | Yes to both; nothing the user saved disappears. |
| D5 | **A Hisn dua opens in the Azkar reader** (counter, audio, reminder) instead of a new Duas reader. | Yes (ADR 0055 §1). A Duas-flavoured header on that reader would need a frame (§6). |
| D6 | **Duas search** in this change, or later (ADR 0044 decision 15: later). | Later (cut line, step 11). |
| D7 | **Where candidate types are shown.** | Never applied anywhere; listed as warnings in the import report (the 5 Nov Duas rule for unreviewed Quranic rows). No env switch (ADR 0042). |
| D8 | **Reviewer.** There is no content reviewer (CLAUDE.md Phase 7 note); the developer marks every row. | As decided. |

Licensing: none new. OpenDua Arabic is accepted on its public statements (ADR 0038); HadeethEnc is `granted` by developer decision, written confirmation still open (content plan). Religious interpretation: only D1 option B and the type rows themselves, both the developer's. Navigation: D3, D5, the new routes. Destructive migrations: none (additive column, no `user.db` change). ADR conflicts: ADR 0044 amendments of 5 Nov and 15 Nov 2026 (Hisn stays in Azkar only) and ADR 0044 §2 «no themes»; both are amended by ADR 0091 once accepted.

## 4. Design in one page

- **Type metadata.** `apps/api/config/azkar_entry_types.php`: `entry_key => ['type' => 'dhikr'|'dua', 'status' => 'reviewed'|'candidate', 'evidence' => '...']`. One row per entry (262 shipped; the 5 excluded entries are not classified). The import reads it through a policy class (production: reviewed only), like `QuranReferencePolicy`.
- **Where an entry shows.** `home` is computed at import: `'duas'` when the entry has a reviewed `dua` type and is in no `session` category (`azkar_entry_categories` joined to `azkar_categories.kind = 'session'`); otherwise null (Azkar).
- **Packs.** Moved duas are served **from the `azkar` pack only**. The `duas` pack is unchanged (no new table, no schema bump). Reason: one copy of every Hisn text, recording, note and count; favourites, progress and reminders keep resolving by `entry_key`. Both packs together serve the Duas page: Hisn categories come from `azkar`, prophetic and Quranic from `duas`. If the `azkar` pack is not installed the Hisn categories are absent (ADR 0017, no dead ends), and the rest of Duas works.
- **Schema change.**
  - MySQL `azkar_entries`: `entry_class` varchar(8) null (`dhikr|dua`, the reviewed type, server-side provenance), `home` varchar(8) null.
  - Pack `azkar_entries`: **only `home`**, nullable. `PackSchema::VERSION` stays 1.
  - Device `content.db`: migration `0017_azkar_entry_home.sql` (`ALTER TABLE azkar_entries ADD COLUMN home text`), Drizzle `schema.ts`, `content-tables.ts` column list.
  - Compatibility both ways: an old pack lacks the column and `packSelectList` reads it as NULL; an old app ignores the extra pack column. No deploy order needed.
- **User data.** No `user.db` migration. Keys are unchanged: favourites by `entry_key`, progress by `scope_key` (`category:<topic>` or `entry:<key>`) and `item_key`, reminders by `target_key`. Old `category:<topic>` progress rows for a moved entry stay stored and simply stop counting toward the topic (progress is per period, so it is short-lived anyway). Nothing is rewritten or deleted.
- **OTA.** No native change. No package, no plugin, no `app.config.ts` native field. The SQL migration is bundled in JavaScript. Release by `eas update --channel production` after `npx eas-cli fingerprint:compare` matches the store build.
- **Text integrity.** No step writes or reads Quran text beyond what exists. The `azkar_items`, `azkar_segments` and `azkar_notes` rows are byte-identical before and after (step 3 test).

## 5. Steps

Each step is one reviewable change. Run the checks for every app touched (`composer qa`; mobile `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`). An agent writes no religious text: fixtures use marked placeholders («نص تجريبي — ليس دعاءً», `FIXTURE text — not a dua`); reports give keys and counts only.

### Step 0 — Decisions and frames (developer; no code)
- Developer answers D1–D8 and approves or redraws the frames in §6 (ADR 0087 flow: draw in `screens/frames/duas/…`, rebuild with `python3 design/screens/scripts/build.py && python3 design/scripts/build_reference.py` (on this Windows machine `python`), review at `design/<stack>/<Screen>/index.html?theme=both&dir=both&sizes=compact%2Cmedium%2Cexpanded%2Clandscape`).
- Developer reviews `docs/plans/azkar-duas-split/classification.md` row by row.
- **Gate:** nothing below step 5 starts before the frames for D1 are approved. Steps 1–4 (server, no UI) may start after D2 and D7 only.

### Step 1 — ADR and spec edits (docs)
- Files: `docs/adr/0091-duas-get-all-duas.md` (status → accepted with the answers), pointer lines in ADR 0031 §9, ADR 0044-duas (new amendment line), ADR 0090 («Not done here»), `docs/technical-spec.md` §5 (`azkar_entries.entry_class`, `home`), §6 (device column), §7 (import computes `home`; Azkar excludes `home='duas'` from browse), §12 (Duas browsing), `docs/content-plan.md` (Duas rows: Hisn duas reference).
- Tests: none. Gate: developer reads the diff.

### Step 2 — Types config, policy and checker (API)
- Files: `apps/api/config/azkar_entry_types.php` (empty `[]` until the developer commits reviewed rows; or the sheet's rows with their real statuses), `app/Domains/Azkar/Services/EntryTypePolicy.php` (accepts `reviewed` in production; `candidate` never applied, returned as warnings), `app/Domains/Azkar/Console/EntryTypesCheckCommand.php` (`azkar:entry-types-check`: every key exists in the pinned catalogue and is not in `excluded_entries`; type and status values valid; evidence present; counts per type and status; reads the sheet's count if present).
- Tests (Pest, `tests/Feature/Azkar/EntryTypePolicyTest.php`, `EntryTypesCheckCommandTest.php`): reviewed applied; candidate ignored with a warning in production and locally; unknown key fails; excluded entry fails; unknown type fails; empty config passes; duplicate key impossible (array keys) but sheet-vs-config mismatch reported.
- Gate: `composer qa`.

### Step 3 — `home` at import and in the pack (API)
- Files: migration `2026_11_xx_add_entry_class_and_home_to_azkar_entries_table.php` (additive, nullable); `app/Domains/Content/Models/AzkarEntry.php`; `AzkarTransformer.php` (compute `entry_class`, `home` with the session rule from the entry's category links); `AzkarImportFingerprint.php` (include both so the resource version bumps only when they change); `AzkarImportRepository` (write them); import report (counts: reviewed dua, moved to Duas per topic, kept whole in sessions, candidates not applied); `PackSchema::azkarEntries()` adds `self::text('home', nullable: true)`; `PackBuilder` copies it. `PackSchema::VERSION` unchanged.
- Tests (Pest feature + architecture): (a) empty config, `home` null everywhere and the fingerprint equals the previous one (no version bump, no re-download); (b) reviewed dua outside a session gets `home='duas'`; (c) reviewed dua in a session (each of the five) stays null; (d) reviewed dhikr stays null; (e) entry in a session and a browse topic stays null (D2); (f) candidate stays null; (g) `azkar_items`, `azkar_segments`, `azkar_notes`, `azkar_recordings`, `azkar_entry_categories` rows are identical with and without types (Quran segments and text unchanged; the 6,236-ayah checksum test still passes, spec §14); (h) built pack has the `home` column and `pack_schema_version = 1`; (i) re-import with the same config is `unchanged`.
- Gate: `composer qa`; no endpoint change, so no OpenAPI regeneration (if `ContentManifestResource` is untouched, confirm with `npm run generate -w @quran/api-contract` and an empty diff).

### Step 4 — Device `content.db` column (app data)
- Files: `core/db/content/schema.ts` (`home` on `azkar_entries`), `migrations/0017_azkar_entry_home.sql` plus Drizzle meta/journal and `migrations.js`, `core/sync/content-tables.ts` (nullable `home`), dev fixtures if they build `azkar_entries`.
- Tests (Jest): migration runs on a v16 database; a pack with the column installs; a pack built without it installs and reads `home` as NULL (`packSelectList`); an install replaces the resource's rows and `home` follows.
- Gate: mobile checks.

### Step 5 — Azkar filters `home='duas'` out (app data and screens; no new UI)
- Files (audit and edit): `features/azkar/data/content-repository.ts` (`listCategoryEntries`, topic counts, chapter list, `listBrowseCategories`), `category-cards.ts`, `category-progress.ts`, `search.ts`, `recent-azkar.ts`/`recent-scopes.ts` (Home picks), and their screens (`AzkarHomeScreen`, `AzkarCategoryScreen`, `AzkarSearchScreen`). Filter `(e.home IS NULL)`. **Not filtered:** session categories, `getEntryByKey`, the reader and entry routes, favourites list, reminders, progress writes.
- Tests (Jest, existing suites extended): a moved entry is absent from its topic's list, count, search results and Home picks; a session entry typed dua is still in its session; `/azkar/entry/<key>` still resolves a moved entry; **user-data survival suite** (spec §11 intent): a favourite on a moved entry still lists in Azkar favourites and opens; `azkar_progress` rows for it are untouched after the pack install; an `entry` reminder target for it still resolves; a favourite of an entry missing from the pack is skipped, not deleted (existing behaviour).
- Gate: mobile checks; UI unchanged except counts, so the existing Azkar frames stay valid (mock values).

### Step 6 — Duas data layer for categories (app data)
- Files: `features/duas/data/categories.ts` (+ test), `hisn-repository.ts` (+ test): `listHisnDuaTopics()` (topics with at least one `home='duas'` entry, count, in `azkar_categories.position` order, names from i18n like Azkar), `listHisnDuasInTopic(topicId)` (reads the azkar tables; returns a preview card like `buildCategoryCards`), `listHisnDuaChapters()` (D3, uses `azkar_chapters.title_ar`); `model.ts` types; `routes.ts` adds `category(id)` for `/duas/category/<id>` with ids `hisn:<topic>`, `hadeethenc:<group>`, `quran`; existing routes stay (deep links, favourites).
- Boundary: read through a public function exported from `features/azkar/data/index.ts` so `features/duas` never imports azkar internals; the architecture test (ADR 0055) still asserts `features/duas` imports no `azkarPlayerStore`.
- Tests: no azkar pack installed returns no Hisn categories (no dead ends); a topic with only session entries is absent; a moved entry in two topics appears in both; counts match; `tsc` clean.

### Step 7 — Duas home and category screens (UI, after frames are approved)
- Files (one component per file, each with `*.test.tsx`): `DuasCategoryTile`, `DuasCategoryGrid`, `DuasHisnCard` (preview, count, same card family as the Azkar category card), `DuasCategoryHeader`, `DuasSourceCredit` (HadeethEnc credit line and source line stay on the dua detail); screens `DuasHomeScreen.tsx` (rewrite), `DuasCategoryScreen.tsx`, `app/duas/category/[id].tsx`; i18n keys in `ar.json` and `en.json`. The Quranic list and detail, the hadith detail, «أدعيتي» and the editor are unchanged.
- Behaviour: a Hisn card opens `/azkar/entry/<entry_key>` (D5); Quranic and prophetic rows open their existing details; «أدعيتي» keeps its card.
- Tests: render, props, press, RTL and LTR, role and label, Dynamic Type; screen test for each category kind; Arabic and English snapshots against the frames.
- Visual check: iPhone 17 simulator screenshot against `python packages/design-tokens/scripts/frame-shot.py DuasHomeCategories out.png` (frame ids per `gx-fig`), light and dark, expanded window via `useWindowClass()`.

### Step 8 — By-chapter list for Hisn duas (UI; only if D3 says yes)
- Files: `DuasChaptersScreen.tsx`, `DuasChapterRow.tsx`, `app/duas/chapters.tsx`; Azkar chapter list filters chapters with no Azkar entry (if the frame `AzkarChapters` is approved).
- Tests: a chapter whose entries all moved is absent from Azkar and present in Duas; titles from `azkar_chapters.title_ar`, null titles hidden (never invented).

### Step 9 — Favourites union (app data and UI)
- Files: `features/duas/data/favorite-cards.ts` (+ test), `DuasFavoritesScreen.tsx`.
- Behaviour: the list shows `dua_favorites` plus `azkar_favorites` whose entry has `home='duas'`, read-only for the second kind (toggle in the Azkar reader). Azkar favourites list is unchanged.
- Tests: both kinds shown newest first; unfavouriting in the reader removes it from both lists; a favourite for an entry absent from the pack is skipped; «مسح البيانات» still clears both tables (`core/db/user/clear.ts`, no change).

### Step 10 — Menu, Home and integration check
- Files: `MenuDuasCard` subtitle count if it shows one; Home tile logic (ADR 0089) if it counts Azkar; widgets (ADR 0035) checked by search that none reads `azkar_entry_categories` (none found under `apps/mobile/src` outside the content repository and fixtures).
- Tests: Maestro flows (spec §14): Azkar home → topic (moved dua absent) → Duas home → Hisn category → open the dua in the reader → favourite → Duas favourites; Arabic and English; compact and expanded windows (device matrix rows for iPhone Pro Max-size, iPad mini, Android phone and foldable).

### Step 11 — Duas search (cut line)
- Search over Hisn dua entries (reuse `azkar_segments.text_search`), prophetic (`dua_hadith.text_search`) and Quranic spans (`search_quran`). Needs a frame (§6). Not in the first release.

### Step 12 — Taybah category list (cut line, only if D1 = B)
- ADR 0044 amendment; `config/dua_categories.php` keyed by `dua_key`, same `reviewed|candidate` rule; `dua_categories` and `dua_item_categories` tables in the `duas` pack (a pack schema version bump or a nullable additive design, decided then); every Quranic span and hadith classified by the developer. Planned separately, with its own review sheet.

### Step 13 — Release
- API: deploy (Railway, push to `main`). The web start imports with `--defer-pack` and builds packs (`docker/start-web.sh`, ADR 0044-packs). With an empty types config nothing moves.
- App: `npx eas-cli fingerprint:compare` (must match), then `eas update --channel production` with `APP_VARIANT=production` and `EXPO_PUBLIC_API_URL` set (`apps/mobile/CLAUDE.md`). **Native change: none expected; if the fingerprint differs, stop and report.**
- Content: the developer commits reviewed rows in `config/azkar_entry_types.php`; the next web start bumps the `azkar` version and devices re-download the pack. This can be days after the app release.
- Order independence: any order of (API deploy, OTA, types commit) is safe (§4, Compatibility).

### Step 14 — Permission requests (developer, parallel, non-blocking)
- Send the drafts in `docs/permission-requests/duas-sources.md`. A reply changes nothing until a new ADR, a source row and a pinned snapshot exist. Nothing from those sources is imported.

## 6. Frames (ADR 0087)

Existing and pending, read:
- `screens/frames/duas/DuasHomeCategories.html` (home: «أدعيتي» card, «التصنيفات» grid of 8 of 14, credit line) and `DuasCategory.html` (one category, mixed Quranic and prophetic rows, each with a source line). Both carry «(بانتظار الموافقة)» in `screens/index.html`.

What the existing two do not match:
- Category names are themed and mix sources: they are D1 option B. Under option A they must be redrawn to the sourced names, with the counts and the source label per row.
- «عرض الكل ١٤» links back to the same frame; the all-categories page is not drawn.
- A Hisn dua row is not drawn (preview, count, «حصن المسلم» source label); the rows drawn are Quranic and prophetic.
- No Dark and no English variant of either frame (every other Duas frame has both).

Frames needed (each light, dark, English LTR; compact 390 × 844, plus an expanded 1194 × 834 for the home):
1. `DuasHomeCategories` redrawn for the approved D1 (+ `Dark`, `English`, `Expanded`).
2. `DuasCategory` for a Hisn topic (Hisn card rows) and for the prophetic and Quranic categories (+ `Dark`, `English`).
3. `DuasCategories` (all categories, the «عرض الكل» page), if the home shows a subset.
4. `DuasChapters` (by chapter, D3), if D3 = yes.
5. `DuasFavorites` showing the two kinds (none exists in `screens/frames/duas/`; ADR 0044 reused the Azkar layout).
6. `DuasCategoryEmpty` / unavailable (Hisn categories when the Azkar pack is not installed; nothing to show). Optional if the home simply omits the section.
7. `DuasSearch` only if D6 = in this change.
8. A Duas-flavoured header on the reader, only if D5 = no.
9. Azkar side: no new frame. `AzkarHome`, `AzkarCategory` and `AzkarChapters` keep their layout; their mock counts are values, not design. `AzkarChapters` (pending) needs the D3 note.
10. Retire or redraw `DuasHome`, `DuasHomeDark`, `DuasHomeEnglish`: they still show Hisn topic tiles and the 74/103 counts that the 5 Nov and 15 Nov amendments removed.

Each new or changed design: draw in `screens/frames/duas/…`, add its `gx-fig` caption with «(بانتظار الموافقة)» to `screens/index.html`, rebuild, hand over the `design/<stack>/<Screen>/index.html?theme=both&dir=both&sizes=compact%2Cmedium%2Cexpanded%2Clandscape` link. Generated `design/` files are never hand-edited. Run `npm run check:html -w @quran/design-tokens`.

## 7. Release blockers

1. Frames approved (step 0).
2. D1 answered (it decides the frames and whether step 12 exists).
3. Reviewed rows are **not** a blocker: the release is safe with an empty types config.
4. Fingerprint unchanged (OTA), else a store build with the developer's say-so.
5. Phase 7 note: the app release and an English-UI device look are already waiting on the developer; this change can ride the same update but needs its own device check in Arabic and English.

## 8. Risks

- A Hisn dua moved to Duas but its Azkar-pack version is old on a device: it still shows in Azkar (no loss), the Duas category is empty for it. Self-heals at the next pack update.
- Entries with several recitations (variations, ADR 0031 §6) are classified as a whole entry; a mixed entry is the developer's call in the sheet.
- Counts on the Duas home are computed on device from two packs; a slow query on large topics is avoided by reading one join, as `listCategoryEntries` does.
- Frame text such as category names must not be copied into code or i18n until approved.

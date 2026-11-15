# Step 9 — Other riwayat: edition switch, per-edition download, marks and place kept per riwayah (ADR 0090 decisions 2, 4, 10, 12; «Decided» 1 and 5)

On `main` in `/Applications/MAMP/htdocs/quran-app` (check with `git branch --show-current`; the work moved there from the worktree on 15 Nov 2026). Stage and commit nothing. Add no dependency. Mobile app only (`apps/mobile`): no API change, no contract change.

## Model

- **By the developer rule, Parts A–E and H go to Haiku.** The plan names Opus only for writing this brief.
- **Recommended, not decided (Q6):** Opus for Parts A and B (the `user.db` migration and the repositories).
  - The migration is hand-written, because Drizzle can't generate it here (see «What exists today»).
  - It runs once on every reader's device, and a mistake there can't be taken back.
  - Part D rewires five paths in `ReaderScreen`. The text below gives the code for each, and Q6 also asks about D.
- **Parts F and G are blocked** until the developer approves their frames (see «Frames first»). Don't start them before then.
- **Parts A and B also wait for Q1** (the table shape), because it departs from the coordinator's «existing rows become `hafs`».

## Before you start

- Run `git status --short > /private/tmp/claude-501/-Applications-MAMP-htdocs-quran-app/45caaed8-c2a1-4fa5-a801-974871103e43/scratchpad/step9-before.txt`.
  - The tree already holds many uncommitted files from steps 2–8 (the API Mushaf domain, `core/mushaf-pack/`, `mushaf-svg/`, the picker, the deleted Scheherazade files).
  - Never revert, stage or edit those, except the files this brief names.
  - At the end, compare `git status --short` with the saved list. The only new differences must be this step's files.
- Read `.claude/agent-rules.md`, root `CLAUDE.md`, `apps/mobile/CLAUDE.md`, and `.agents/skills/apple-design/SKILL.md`. This step changes no UI until F and G.
- **No Quran text anywhere you write:** fixtures, notes bodies, test names or reports.
  - Note bodies use `FIXTURE note 1 — not Quran` and «نص تجريبي ١ — ليس قرآنًا».
  - `src/features/library/data/repository.test.ts` has a real ayah in `AYAH_1_1`. Do not copy that pattern.

## Read first (every path checked 15 Nov 2026)

- `docs/adr/0090-madinah-svg-mushaf.md`: decisions 2, 4, 9, 10 and 12, «Decided» 1 and 5, and the W6 consequence (Mushaf pages map to ayahs through the pack's regions, never through `verses.page`).
- `docs/adr/0027-local-only-no-accounts.md` (v1 is local-only; the outbox is dormant) and `docs/adr/0028-one-bookmark-and-playback-place.md` (one bookmark; listening owns the continue-reading place).
- `docs/technical-spec.md`:
  - §6 «`user.db`»;
  - §11 (all of it, including the test list on its last line);
  - §12 «Reader» (the «Highlights» bullets and «Mushaf place»).
- Built in steps 5, 7 and 8:
  - `src/core/mushaf-pack/{index,types,useSvgMushafPack,install-svg-mushaf,installed-store,SvgMushafPackReader}.ts`;
  - `src/features/reader/mushaf-svg/{shown-mushaf,useChosenMushafKey,ayah-label}.ts` and `ayah-label.test.ts`;
  - `src/features/reader/MushafSvgList.tsx` and its test;
  - `src/features/reader/components/{MushafSvgContainer,MushafSvgPage,MushafDownloadCard,MushafPicker}.tsx` and their tests;
  - `src/features/reader/screens/{ReaderScreen,ReaderSettingsSheet}.tsx` and their tests;
  - `src/features/onboarding/screens/OnboardingScriptScreen.tsx`;
  - `src/features/reader/{mushafs,settings-model,settings,saved-wash,selection}.ts`.
- Personal data:
  - `src/core/db/user/{schema,clear,open}.ts`;
  - `src/core/db/user/migrations/` (all SQL files, `migrations.js`, `meta/_journal.json`);
  - `src/core/db/user/{user-db,clear}.test.ts`;
  - `src/features/library/data/{model,repository,live-queries,hooks,index}.ts` and `repository.test.ts`;
  - `src/features/reader/anchor/{reading-anchor,page,useReadingAnchor,usePlaybackReadingPlace,useLastReadVerseKey}.ts`;
  - `src/core/storage/mmkv.ts`.
- Helpers: `apps/mobile/jest/{apply-content-migrations,node-sqlite-executor}.ts`.

## What exists today (facts this brief builds on)

1. **The edition switch is already wired** (steps 7 and 8). Reading the chain end to end:
   - `MushafPicker` calls `setMushaf(key)` (`settings.ts`), which writes `mushaf` into the `reader.settings` MMKV JSON.
   - `useChosenMushafKey()` reads it.
   - In `ReaderScreen.tsx`:
     - line 183: `shownMushafKey({ chosen, playing: active, reciterRiwayah: null })`;
     - line 184: `useSvgMushafPack(shownMushaf)`;
     - lines 467–472: `<MushafSvgContainer mushafKey={shownMushaf} …>`.
   - The container shows `MushafSvgList` once the pack is installed, and `MushafDownloadCard` until then. On the first `absent` it calls `download()`, which runs `installSvgMushaf(key)` (step 5).

   **Per-edition pack download is therefore `useSvgMushafPack(key).download()`, one pack file per riwayah.** This step adds no new download path.
2. **Gaps in that wiring, fixed in Part C:**
   - **The auto-start guard is per mount, not per riwayah.** `MushafSvgContainer` keeps a single `started` ref and has no `key`, so the second edition switched to in one visit never auto-starts.
   - **Playback can start a Hafs download.** The guard also fires for a riwayah shown only because audio plays: decision 12 shows Hafs pages while a Hafs reciter plays, so a Warsh reader who taps play gets a Hafs download.
   - **A non-Hafs choice can fall back to Hafs silently.** `svgShown` (line 185) is false when the chosen pack is neither installed nor in the manifest. A Warsh choice then shows the old flowed Hafs `HafsMushafList`, with no word that it isn't Warsh.
   - **The picker shows no download state.** The approved frames (`core/ReaderSettings`, `onboarding/OnboardScript`) show «مُنزَّل» or the size on each card. `MushafPicker` has `downloaded` and `sizeBytes` props, but no caller passes them.
3. **Non-Hafs pages draw no marks today.** In `MushafSvgList.tsx`:
   - lines 248–260 return `NO_MARKS` when `!isHafs`;
   - line 261 limits `khatmaKey` to Hafs, and line 262 limits `placeKey` to Hafs.
4. **Screen-reader labels for non-Hafs pages are already built** (decision 10):
   - `mushaf-svg/ayah-label.ts`: Hafs reads the Imla'i text plus the number; any other riwayah, or a Hafs verse missing from `content.db`, reads the surah name plus «الآية ٥»;
   - `MushafSvgPage` appends the highlight colour name.

   Nothing new is built for decision 10. Part E only adds a test showing that a riwayah colour reaches that label.
5. **A tap on a non-Hafs ayah writes Hafs data today.** `onSelectVerseKey` and `onOpenAyahActions` call `selectVerse(key)`, which pushes `/ayah/{key}`. That opens the Hafs sheet (`AyahActionsPanel`, keyed by the Hafs `verseId` of the same number). Its highlight row then writes a Hafs mark on a different ayah. Part E stops this, and Part F replaces it.
6. **The reading place is MMKV, not `user.db`.**
   - The keys are `reader.lastVerseKey`, `reader.lastPage` and `reader.mode` (`reading-anchor.ts`).
   - Seven places read `reader.lastVerseKey` as a **Hafs** key through `getVerseByKey`:
     - Home;
     - the Index continue row;
     - `MiniPlayer`;
     - `useMiniUnavailable`;
     - menu previews;
     - `KhatmaScreen`;
     - `WidgetSnapshotSync`.
   - Today, a hand scroll on a non-Hafs page calls `anchor.setVisible({ verseKey })` with a Warsh-numbered key (`mushafShared.onTopAyah`, lines 351–357). That key would land in `reader.lastVerseKey` and be read as Hafs. Part D stops this.
7. **`user.db` facts:**
   - `bookmarks`, `highlights` and `notes` have `verse_id INTEGER NOT NULL` (a Hafs verse id, 1–6,236).
   - The repositories write a `dirty = 1` row and one `outbox` row per item (`repository.ts` `writeOutbox`, upsert on `(entity, entity_id)`). Nothing reads the outbox: there is no `core/sync/user-sync.ts` and no API user-data tables (ADR 0027).
   - `khatma` never reads `bookmarks` (checked: no `bookmark` in `src/features/khatma`).
   - **Drizzle can't generate the next migration.** `migrations/meta/` holds snapshots only through `0004`. `0005`–`0007` were hand-written, with round-number `when` values. `npm run db:generate:user` would diff against `0004_snapshot.json`, which lacks `my_duas`, `dua_favorites`, `names_favorites` and `hadith_*`, so it would emit those `CREATE TABLE`s again and break every device on open. **Do not run `db:generate:user`.** Part A gives the SQL verbatim.

## Conflicts and gaps found (handle exactly as written; the developer decides the open questions)

1. **"Existing rows become `hafs`" (the coordinator's task) versus the table shape.** Four facts decide the shape:
   - `verse_id` is `NOT NULL`;
   - spec §6 says «`user.db` migrations are always additive»;
   - `surah` and `ayah` can't be backfilled inside a `user.db` migration, because the numbers live in `content.db`;
   - a non-Hafs ayah has no Hafs `verse_id`.

   Putting non-Hafs rows into the existing tables would mean making `verse_id` nullable, which is a table rebuild and not additive. It would also need a Hafs filter added to every existing reader (`listBookmarks`, `listHighlights`, `getHighlights`, `getNotes`, `listNotes`, every query in `live-queries.ts`, `useHighlightsByVerseId`, the My Quran tabs, `clearOtherBookmarks`).

   **This brief adds three new tables for the other four riwayat** (Part A). Every existing row is a Hafs mark by definition, because its `verse_id` is a Hafs id. Those rows stay where they are, untouched. The new tables refuse `'hafs'` through a `CHECK`. See Q1.
2. **Spec §6 lists `reading_position` and `settings` tables in `user.db`.**
   - The code has neither: the place is MMKV (fact 6), and so are the reader settings.
   - `PERSONAL_TABLES` still names `reading_position` and `search_history`; `clearLocalUserData` swallows the missing-table error.
   - This brief keeps the per-riwayah place in MMKV, beside the existing keys, and does not touch the old rows in §6. See Q4.
3. **«Decided» 5's carry-over is marked "proposed, not yet confirmed".**
   - It defines only non-Hafs → Reading.
   - This brief applies the same rule in both directions, and prefers the riwayah's own saved place when that place still maps to the shared one (Part D). See Q3.
4. **ADR 0028 has one bookmark; ADR 0090 decision 4 keeps bookmarks per riwayah.** This brief keeps **one bookmark per riwayah**. Hafs keeps its one bookmark in `bookmarks`, and each other riwayah has at most one live row in `riwayah_bookmarks`. See Q2.
5. **Plan step 9's line «per-edition pack download» needs no new download code** (fact 1). The visible part is the picker's «مُنزَّل» or size, which the approved frames already draw (Part C3).

## Frames first (ADR 0087; the coordinator draws them, not the implementer)

Parts F and G change what the screens draw, and no frame covers them (checked: `screens/frames/core/AyahSheet.html` shows only a Hafs ayah with its text, play, tafsir, repeat, copy and share; `reading/Reading.html` and `reading/Focus.html` show no riwayah). Each new frame:

- is copied from the named sibling in the same section, then edited only in the frame file;
- gets its `gx-fig` block with the iframe in `screens/index.html`, captioned «(بانتظار الموافقة)»;
- holds no Quran text: replace any ayah text copied from the sibling with the plan's placeholder style;
- is rebuilt with `python3 design/screens/scripts/build.py && python3 design/scripts/build_reference.py`, never hand-editing `design/`;
- is reviewed at `design/<stack>/<FrameId>/index.html?theme=both&dir=both&sizes=compact%2Cmedium%2Cexpanded%2Clandscape` (find the stack in `design/catalog.json` after the build);
- is checked with `npm run check:html -w @quran/design-tokens`.

The frames (proposals for the developer; the approved frame wins over this text):

- **F1 `AyahSheetRiwayah`** (`screens/frames/core/`, from `AyahSheet.html`). The ayah options for a non-Hafs ayah:
  - the same sheet chrome;
  - a header with the reference «البقرة · الآية ٥» (`reader.ayahPanel.reference`) and, below it in the muted style, the riwayah name «ورش عن نافع» (`reader.mushafs.warsh.name`);
  - **no ayah text card**, because there is no text source (decision 10);
  - the «تظليل» highlight row, unchanged;
  - only two action tiles, «حفظ» or «محفوظة», and «ملاحظة».

  No play, tafsir, repeat, khatma, copy or share: tafsir and audio stay Hafs (decision 4, «Decided» 1), and there's no text to copy. It needs no new string.
- **F2 `ReadingOtherRiwayah`** (`screens/frames/reading/`, from `Reading.html`) and **F3 `FocusOtherRiwayah`** (from `Focus.html`). The one change in each:
  - Reading: the title pill's subtitle ends with « · حفص عن عاصم»; on a compact phone it reads «وضع القراءة · حفص عن عاصم»;
  - Focus: the position line ends with « · حفص عن عاصم».

  New string: `reader.toolbar.withRiwayah` (Part G).

---

## Part A. `user.db`: three tables and migration 0008 (after Q1; Opus recommended, Q6)

### A1. `src/core/db/user/schema.ts`

Add after `notes`, mirroring the existing tables, with the `syncColumns` spread and `check`, `index` and `uniqueIndex` as the file already uses them:

```ts
/** The riwayat whose marks live in the riwayah_* tables (ADR 0090 decision 4). Hafs marks stay in bookmarks, highlights and notes. */
export const riwayahMarkKeys = ['warsh', 'qalun', 'shubah', 'duri'] as const;
```

- **`riwayahBookmarks` = `sqliteTable('riwayah_bookmarks', …)`.**
  - Columns, in order:
    1. `id` text PK;
    2. `riwayah` text `{ enum: riwayahMarkKeys }` not null;
    3. `surah` integer not null;
    4. `ayah` integer not null;
    5. then `...syncColumns`.
  - Constraints:
    - `check('riwayah_bookmarks_ayah', …)`, the same expression as the SQL below;
    - `uniqueIndex('riwayah_bookmarks_live_idx').on(table.riwayah).where(sql\`${table.deletedAt} is null\`)`;
    - `index('riwayah_bookmarks_ayah_idx').on(table.riwayah, table.surah, table.ayah)`.
- **`riwayahHighlights` = `sqliteTable('riwayah_highlights', …)`.**
  - Columns: `id`, `riwayah`, `surah`, `ayah`, then `color` text `{ enum: highlightColors }` not null, then `...syncColumns`.
  - Constraints:
    - `check('riwayah_highlights_ayah', …)`;
    - `index('riwayah_highlights_ayah_idx').on(riwayah, surah, ayah)`;
    - `uniqueIndex('riwayah_highlights_live_ayah_idx').on(riwayah, surah, ayah).where(deleted_at is null)`.
- **`riwayahNotes` = `sqliteTable('riwayah_notes', …)`.**
  - Columns: `id`, `riwayah`, `surah`, `ayah`, then `body` text not null, then `...syncColumns`.
  - Constraints:
    - `check('riwayah_notes_ayah', …)`;
    - `check('riwayah_notes_body_length', …)`, the same as `notes_body_length`;
    - `index('riwayah_notes_ayah_idx').on(riwayah, surah, ayah)`.

The keys are sync-safe: a client UUID `id`, plus `(riwayah, surah, ayah)` in that riwayah's own numbering. The natural key never uses a pack row id, a page, or a Hafs `verse_id`, so a pack update or a new pack version can't orphan a mark.

### A2. `src/core/db/user/migrations/0008_riwayah_marks.sql` (new, verbatim)

```sql
CREATE TABLE `riwayah_bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`riwayah` text NOT NULL,
	`surah` integer NOT NULL,
	`ayah` integer NOT NULL,
	`client_updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer NOT NULL,
	CONSTRAINT "riwayah_bookmarks_ayah" CHECK("riwayah_bookmarks"."riwayah" in ('warsh', 'qalun', 'shubah', 'duri') and "riwayah_bookmarks"."surah" between 1 and 114 and "riwayah_bookmarks"."ayah" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `riwayah_bookmarks_live_idx` ON `riwayah_bookmarks` (`riwayah`) WHERE "riwayah_bookmarks"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `riwayah_bookmarks_ayah_idx` ON `riwayah_bookmarks` (`riwayah`,`surah`,`ayah`);--> statement-breakpoint
CREATE TABLE `riwayah_highlights` (
	`id` text PRIMARY KEY NOT NULL,
	`riwayah` text NOT NULL,
	`surah` integer NOT NULL,
	`ayah` integer NOT NULL,
	`color` text NOT NULL,
	`client_updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer NOT NULL,
	CONSTRAINT "riwayah_highlights_ayah" CHECK("riwayah_highlights"."riwayah" in ('warsh', 'qalun', 'shubah', 'duri') and "riwayah_highlights"."surah" between 1 and 114 and "riwayah_highlights"."ayah" >= 1)
);
--> statement-breakpoint
CREATE INDEX `riwayah_highlights_ayah_idx` ON `riwayah_highlights` (`riwayah`,`surah`,`ayah`);--> statement-breakpoint
CREATE UNIQUE INDEX `riwayah_highlights_live_ayah_idx` ON `riwayah_highlights` (`riwayah`,`surah`,`ayah`) WHERE "riwayah_highlights"."deleted_at" is null;--> statement-breakpoint
CREATE TABLE `riwayah_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`riwayah` text NOT NULL,
	`surah` integer NOT NULL,
	`ayah` integer NOT NULL,
	`body` text NOT NULL,
	`client_updated_at` integer NOT NULL,
	`deleted_at` integer,
	`dirty` integer NOT NULL,
	CONSTRAINT "riwayah_notes_ayah" CHECK("riwayah_notes"."riwayah" in ('warsh', 'qalun', 'shubah', 'duri') and "riwayah_notes"."surah" between 1 and 114 and "riwayah_notes"."ayah" >= 1),
	CONSTRAINT "riwayah_notes_body_length" CHECK(length("riwayah_notes"."body") between 1 and 10000)
);
--> statement-breakpoint
CREATE INDEX `riwayah_notes_ayah_idx` ON `riwayah_notes` (`riwayah`,`surah`,`ayah`);
```

- The migration is purely additive: three `CREATE TABLE` and their indexes. It never touches `bookmarks`, `highlights`, `notes` or `outbox`.
- `ayah` has no upper bound: counts differ between riwayat, and al-Duri's (Basri) count of al-Baqarah is above Hafs's.
- `color` is checked in the repository, as it is for `highlights` today.

### A3. Register the migration

- `meta/_journal.json`: append `{ "idx": 8, "version": "6", "when": 1793537000000, "tag": "0008_riwayah_marks", "breakpoints": true }`.
- `migrations.js`: add `import m0008 from './0008_riwayah_marks.sql';` and `m0008` to the `migrations` object, after `m0007`.
- Add no snapshot file: there is none for 0005–0007 either.

### A4. Clearing («مسح البيانات»)

- `src/core/storage/mmkv.ts`: add `readerRiwayahPlace: (key: string) => \`reader.riwayahPlace.${key}\`` to `storageKeys`, next to `readerLastPage`. Part D uses it.
- In `src/core/db/user/clear.ts`:
  - `PERSONAL_TABLES`: add `'riwayah_bookmarks'`, `'riwayah_highlights'` and `'riwayah_notes'` after `'notes'`.
  - `PERSONAL_STORAGE_KEYS`: add the four riwayah place keys (`...riwayahMarkKeys.map(storageKeys.readerRiwayahPlace)`, importing `riwayahMarkKeys` from `./schema`), after `storageKeys.readerLastPage`.

### A5. Tests (`src/core/db/user/user-db.test.ts`, `clear.test.ts`)

1. The table list test: add `'riwayah_bookmarks'`, `'riwayah_highlights'` and `'riwayah_notes'` in sorted position (after `'recent_listens'`).
2. The journal test: the tag list ends with `'0008_riwayah_marks'`, and `migrations.js` contains `m0008`.
3. **An upgrade test:**
   - apply `0000`–`0007` on an empty database;
   - insert one row each into `bookmarks`, `highlights` and `notes` (placeholder body);
   - apply `0008`;
   - the three rows are byte-identical, `outbox` is unchanged, and the three new tables exist and are empty.
4. **Constraints:**
   - `riwayah = 'hafs'` is refused in each new table (`/check/i`);
   - so are `surah` 0, `surah` 115 and `ayah` 0;
   - an empty note and a 10,001-character note are refused;
   - a second live bookmark for the same riwayah is refused (`/unique/i`), while one live bookmark for `warsh` and one for `qalun` both pass;
   - a second live highlight on the same `(riwayah, surah, ayah)` is refused, but passes once the first has `deleted_at` set;
   - the same `(surah, ayah)` highlighted in `warsh` and in `qalun`, and as a Hafs `highlights` row, all pass. They are independent.
5. `riwayahMarkKeys` equals `SVG_MUSHAF_KEYS` (from `@/core/mushaf-pack`) without `'hafs'`, in the same order.
6. `clear.test.ts`: `PERSONAL_TABLES` includes the three tables, and a clear empties them; `PERSONAL_STORAGE_KEYS` includes the four `reader.riwayahPlace.*` keys.

## Part B. Repositories and live hooks (after Q1; Opus recommended, Q6)

### B1. Types (`src/features/library/data/model.ts`, append)

```ts
export type RiwayahKey = (typeof riwayahMarkKeys)[number];            // import riwayahMarkKeys from '@/core/db/user/schema'
export type RiwayahAyah = { riwayah: RiwayahKey; surah: number; ayah: number };
export type RiwayahBookmark = RiwayahAyah & { id: string; clientUpdatedAt: number };
export type RiwayahHighlight = RiwayahAyah & { id: string; color: HighlightColor; clientUpdatedAt: number };
export type RiwayahNote = RiwayahAyah & { id: string; body: string; clientUpdatedAt: number };
export class RiwayahAyahValidationError extends Error { readonly code = 'riwayah_ayah_invalid' as const; /* name set like HighlightValidationError */ }
export function isRiwayahKey(value: unknown): value is RiwayahKey;
/** Throws RiwayahAyahValidationError unless riwayah is a RiwayahKey, surah an integer 1..114 and ayah an integer >= 1. */
export function assertRiwayahAyah(value: RiwayahAyah): void;
```

### B2. Shared helpers (`src/features/library/data/repository.ts`)

- Export the private helpers `resolveStore`, `writeOutbox`, `softDelete` and `deletePayload`, unchanged in behaviour. Do not export them from `index.ts`.
- Widen `softDelete`'s `table` parameter to `'bookmarks' | 'highlights' | 'notes' | 'riwayah_bookmarks' | 'riwayah_highlights' | 'riwayah_notes'`.
- Nothing else in this file changes. Every Hafs path stays byte-for-byte the same.

### B3. `src/features/library/data/riwayah-repository.ts` (new)

Every write runs in one `db.transaction`, as `repository.ts` does. Each validates first with `assertRiwayahAyah`, and with `isHighlightColor` for a colour, before touching the database.

| Function | Behaviour (each mirrors its Hafs twin in `repository.ts`) |
| --- | --- |
| `toggleRiwayahBookmark(ayah: RiwayahAyah, store?: UserStore): RiwayahBookmark \| null` | One live bookmark per riwayah (Q2), which never touches `bookmarks`. If the live row is this ayah, soft-delete it and write an outbox `delete`, then return `null`. If the live row is another ayah of the same riwayah, soft-delete it with its outbox `delete` and continue. Revive the newest tombstone for this `(riwayah, surah, ayah)` if there is one (`UPDATE … deleted_at = NULL, dirty = 1`); otherwise `INSERT` with `uuid()`. Then write an outbox `upsert`. |
| `setRiwayahHighlight(ayah: RiwayahAyah, color: HighlightColor \| null, store?): RiwayahHighlight \| null` | Like `setHighlight`, keyed on `(riwayah, surah, ayah)`: `null` soft-deletes the live row; a colour updates the live row, revives the newest tombstone, or inserts. |
| `saveRiwayahNote(ayah: RiwayahAyah, body: string, store?): RiwayahNote` | `prepareNoteBody(body)` first (the same trim and length rules), then insert with a new id. |
| `deleteRiwayahNote(id: string, store?): void` | Like `deleteNote`. |
| `getRiwayahNotes(ayah: RiwayahAyah, store?): RiwayahNote[]` | Live notes for the ayah, newest first, `id ASC` on ties. |
| `listRiwayahHighlights(riwayah: RiwayahKey, store?): RiwayahHighlight[]` | Live rows of the riwayah, ordered `surah, ayah, id`. |
| `getRiwayahBookmark(riwayah: RiwayahKey, store?): RiwayahBookmark \| null` | The live row, or `null`. |

Outbox (spec §11 rule 1, unchanged): one row per `(entity, entity_id)`, upserted through `writeOutbox`.

| Entity | `upsert` payload (JSON, keys in this order) | `delete` payload |
| --- | --- | --- |
| `riwayah_bookmark` | `{ id, riwayah, surah, ayah, client_updated_at }` | `deletePayload(id, clientUpdatedAt)` |
| `riwayah_highlight` | `{ id, riwayah, surah, ayah, color, client_updated_at }` | same |
| `riwayah_note` | `{ id, riwayah, surah, ayah, body, client_updated_at }` | same |

**v1 (ADR 0027):** no code sends or reads these rows, as with the Hafs ones. The rows are written so that a future sync has them, and because spec §11 rule 1 says every personal write upserts one. Add nothing that reads the outbox.

### B4. Live queries and hooks

`live-queries.ts`, following `liveHighlightsQuery`'s `sql\`1 = 0\`` pattern for «nothing»:

- `liveRiwayahHighlightsQuery(db, riwayah: RiwayahKey | null)`: live rows of that riwayah, or none when `null`.
- `liveRiwayahBookmarkQuery(db, riwayah: RiwayahKey | null)`: the live row, or none.
- `liveRiwayahNotesQuery(db, ayah: RiwayahAyah | null)`: live notes of the ayah, newest first, or none.

`hooks.ts`:

```ts
/** `surah:ayah` (in the riwayah's own numbering) → colour; empty for null. */
export function useRiwayahHighlightsByVerseKey(riwayah: RiwayahKey | null): ReadonlyMap<string, HighlightColor>;
/** The saved ayah of that riwayah as `surah:ayah`, or null. */
export function useRiwayahBookmarkKey(riwayah: RiwayahKey | null): string | null;
export function useRiwayahNotes(ayah: RiwayahAyah | null);   // the useLiveQuery result, as useNotes
```

- The dependency array of each `useLiveQuery` is the riwayah, or `${riwayah}:${surah}:${ayah}`.
- **Memoize the results on the live query's `data`,** as `useHighlightsByVerseId` does: `useMemo(() => new Map(data.map(…)), [data])`, and the same for the bookmark key. Without it, E2's `useMemo` and the list's `extraData` change on every `ReaderScreen` render, and FlashList repaints every page. Export the new functions, types, `isRiwayahKey`, `assertRiwayahAyah` and `RiwayahAyahValidationError` from `index.ts`.

### B5. Tests

`riwayah-repository.test.ts` (new) copies `repository.test.ts`'s setup (`openNodeSqlite`, `applyContentMigrations`, `jest.mock('expo-crypto', …)`, the `outbox()` and `failOnOutbox` helpers), with placeholder note bodies only. It covers every row of B3 and the sync cases below.

Also:

- **Isolation:** a riwayah write never changes `bookmarks`, `highlights` or `notes`, and `toggleBookmark` (Hafs) never touches `riwayah_bookmarks`.
- **One riwayah never changes another:** saving `warsh` 2:5 doesn't clear the `qalun` bookmark.
- **Bad input:** `riwayah: 'hafs'`, `surah` 0 or 115, `ayah` 0 or 1.5, and an unknown colour each throw `RiwayahAyahValidationError` or `HighlightValidationError` with no row and no outbox row written.
- **Hooks:** add cases to `hooks.test.tsx` in its own pattern. `null` gives an empty map or `null`; a written highlight appears under its `surah:ayah` key.

## Part C. Edition switch and per-edition download (Haiku)

### C1. Auto-start per riwayah, and never for a playback-shown riwayah (`components/MushafSvgContainer.tsx`)

- Add the prop `autoDownload?: boolean` (default `true`), with the doc comment «False while the edition shows only because audio plays (ADR 0090 decision 12): the card waits for a tap.»
- Replace `const started = useRef(false)` with `useRef(new Set<SvgMushafKey>())`. The effect becomes:

  ```ts
  if (autoDownload && pack.status === 'absent' && !started.current.has(props.mushafKey)) {
    started.current.add(props.mushafKey);
    void download();
  }
  ```

  Its dependencies are `[autoDownload, download, pack.status, props.mushafKey]`.
- `ReaderScreen` passes `autoDownload={shownMushaf === chosenMushaf}`. The card's own buttons still download in every case.
- Tests (`MushafSvgContainer.test.tsx`):
  - switching from an installed `warsh` to an absent `qalun` starts `qalun` once, and switching back and forth never starts a key twice;
  - `autoDownload={false}` with `absent` starts nothing, and the card's «تنزيل» starts it.

### C2. A non-Hafs choice never shows the old Hafs list (`ReaderScreen.tsx` line 185)

```ts
const svgShown = shownMushaf !== 'hafs' || svgPack.availableVersion !== null || svgPack.status === 'installed';
```

- A Warsh choice whose pack is unpublished now shows the container.
- The container's auto-start then gets `failed: unavailable`, and the card shows the existing `reader.mushafDownload.error.unavailable`, «المصحف غير متاح الآن.», with «إعادة المحاولة».
- Hafs keeps the step 7 rollout rule unchanged.
- Test (`ReaderScreen.test.tsx`):
  - chosen `warsh`, pack absent from the manifest and not installed: the container renders, not `HafsMushafList`;
  - chosen `hafs`, absent from the manifest: `HafsMushafList` renders.

### C3. The picker shows each edition's download state (approved frames `core/ReaderSettings`, `onboarding/OnboardScript`)

- **In `src/core/mushaf-pack/useSvgMushafPack.ts`, add and export (also from `index.ts`):**

  ```ts
  /** For the mushaf pickers: whether each riwayah's pack is installed, and its catalogue size. */
  export function useSvgMushafPackSummaries(): {
    downloaded: (key: SvgMushafKey) => boolean;        // readInstalled(key) !== undefined (the private helper in this file)
    sizeBytes: (key: SvgMushafKey) => number | undefined;  // readCatalog(key)?.sizeBytes, undefined when null
  };
  ```

  - It subscribes to `useCatalogVersion((s) => s.version)` and `useSvgMushafPackStore((s) => s.revision)`, as `useSvgMushafPack` does, so the cards update when a download finishes or the catalogue arrives.
  - Reuse the private `readInstalled` and `readCatalog`. Do not copy them.
- **`ReaderSettingsSheet.tsx` line 80 and `OnboardingScriptScreen.tsx` line 54:** pass `downloaded={summaries.downloaded}` and `sizeBytes={summaries.sizeBytes}` to `MushafPicker`.
- `MushafPicker` itself is unchanged: its subtitle rules already exist (step 8).
- Tests:
  - the hook, with the installed store and the catalogue read mocked;
  - `ReaderSettingsSheet.test.tsx`: an installed key shows «مُنزَّل» and another shows «٧٣ ميغابايت»-style text from a mocked size (use a fixture number);
  - the onboarding test the same, with sizes only.

## Part D. The reading place per riwayah (Haiku; see Q6)

**Rule:** `reader.lastVerseKey` and `reader.lastPage` stay the **Hafs** place, shared app-wide (Home, Index, mini player, Khatma, widgets, Reading, Focus), unchanged. Each other riwayah gets its own exact place. Crossing between riwayat carries the place by surah and ayah number, or falls back to the surah's first ayah («Decided» 5).

### D1. `src/features/reader/anchor/riwayah-place.ts` (new) and its test

```ts
export function parseVerseKey(verseKey: string): { surah: number; ayah: number } | null;   // positive integers only
/** ADR 0090 «Decided» 5: the same surah and ayah when `has` says the target riwayah has it, else `${surah}:1`. An unparseable key is returned unchanged. */
export function carryVerseKey(verseKey: string, has: (surah: number, ayah: number) => boolean): string;
export type RiwayahPlace = { verseKey: string; page: number };
export function readRiwayahPlace(riwayah: RiwayahKey): RiwayahPlace | undefined;   // malformed JSON or shape → undefined
export function writeRiwayahPlace(riwayah: RiwayahKey, place: RiwayahPlace): void;
```

- MMKV key: `storageKeys.readerRiwayahPlace(riwayah)` (added in A4). The value is JSON `{ "verseKey": "2:5", "page": 3 }`, in that riwayah's numbering, with the pack's page.
- `MushafSvgList.tsx` deletes its local `parseVerseKey` and imports this one.
- Tests:
  - `carryVerseKey`: kept when `has` is true; `s:1` when false; an unparseable key unchanged;
  - read and write round trip;
  - each of these reads as `undefined`: bad JSON, a missing `page`, a non-integer page, a malformed `verseKey`.

### D2. `ReaderScreen.tsx` (edit only these places)

1. **The riwayah being shown,** after line 187:

   ```ts
   // Non-Hafs pages show (ADR 0090 decision 4): only that list works in the riwayah's numbering; everything else stays Hafs.
   const riwayahShown: RiwayahKey | null = mode === 'mushaf' && shownMushaf !== 'hafs' ? shownMushaf : null;
   const hafsHas = (surah: number, ayah: number) => executor !== null && getVerseByKey(executor, `${surah}:${ayah}`) !== undefined;
   const packHas = (surah: number, ayah: number) => svgReader !== null && svgReader.pageForAyah(surah, ayah) !== null;
   // A Hafs-numbered key in the shown riwayah: its own saved place while that place still maps to the key, else the carry.
   const toShownKey = (hafsKey: string): string => {
     if (riwayahShown === null) return hafsKey;
     const saved = readRiwayahPlace(riwayahShown);
     if (saved !== undefined && carryVerseKey(saved.verseKey, hafsHas) === hafsKey) return saved.verseKey;
     return carryVerseKey(hafsKey, packHas);
   };
   const shownViewKey = toShownKey(viewKey);
   ```

   - Compute `toShownKey` and `shownViewKey` on every render, without `useMemo`: they read MMKV, so they must see the place written by the last scroll.
   - Move the line `const shownViewKey = …` to just after `viewKey` is defined (line 201). It needs `viewKey`.
2. **`mushafShared`** (lines 342–372):
   - `anchorVerseKey: shownViewKey`;
   - `placeVerseKey: placeVerseKey === null ? null : toShownKey(placeVerseKey)`;
   - `onVisiblePage`: replace both `viewKey`s with `shownViewKey` (`pageOfVerse(shownViewKey) === page ? shownViewKey : key`). `pageOfVerse` already reads the shown pack;
   - `onTopAyah` becomes:

     ```ts
     onTopAyah: (page: number, verseKey: string) => {
       setVisibleVerseKey(verseKey);
       if (followKey !== null || active) return;   // listening keeps the place (ADR 0028)
       if (riwayahShown === null) {
         anchor.setVisible({ page, verseKey });
         return;
       }
       // The riwayah's exact place first, so the re-render below reads it back (toShownKey).
       writeRiwayahPlace(riwayahShown, { page, verseKey });
       const hafsKey = carryVerseKey(verseKey, hafsHas);
       anchor.setVisible({ page: executor === null ? null : (pageForVerse(executor, hafsKey) ?? null), verseKey: hafsKey });
     },
     ```

     The Hafs place's page here is `verses.page`. On the 36 pages where it differs from the Hafs pack (W6), it can be off by one; see Q9.
3. **The toolbar page** (line 223): `packPageOf(svgReader, viewKey)` becomes `packPageOf(svgReader, shownViewKey)`. `chrome` keeps `loadChrome(executor, viewKey, locale)`: the title is the same surah, and the juz is the Hafs juz of the carried ayah, as step 7's page dividers already do (Q8).
4. **The Mushaf page effect** (lines 247–256):

   ```ts
   const page = riwayahShown === null ? pageOfVerse(anchor.verseKey) : pageForVerse(executor, anchor.verseKey);
   ```

   Add `riwayahShown` to its dependencies. `anchor.verseKey` is Hafs, so its page must not come from a Warsh pack.
5. **Unchanged, and must stay so:** `writeReadingAnchor(route)` on mount, `writePlayedPlace` (playback shows Hafs), `ReadingList anchorVerseKey={viewKey}`, `FocusReader verseKey={focusKey}`, and `usePlaybackReadingPlace`. Reading and Focus are therefore always Hafs, at the carried place. That is the «switch to Hafs automatically» of «Decided» 5, with no new code.

### D3. What the user sees (the cases the tests must pin, in `ReaderScreen.test.tsx`)

Mock `useSvgMushafPack` with a fake reader whose `pageForAyah` knows a small set of keys. Mock `content.db` `getVerseByKey` for a small Hafs set. Use MMKV through the test setup.

1. **Warsh chosen and installed, Mushaf mode, no saved Warsh place:**
   - the anchor `2:5` exists in the pack, so the container gets `anchorVerseKey="2:5"`;
   - the anchor `2:300` is not in the pack, so it gets `"2:1"`.
2. **A saved Warsh place `2:7` whose Hafs carry equals the anchor `2:7`:** the container gets `"2:7"` and its page. If the anchor is `3:1` instead, it gets the carry of `3:1`.
3. **A hand scroll reports Warsh `2:290`** (`onTopAyah(40, '2:290')`), which is not in Hafs:
   - `reader.riwayahPlace.warsh` = `{ verseKey: '2:290', page: 40 }`;
   - `reader.lastVerseKey` = `'2:1'`;
   - `reader.lastPage` is Hafs `verses.page` of `2:1`.

   No Warsh key ever reaches `reader.lastVerseKey`.
4. **Switching the mode to Reading** after case 3: `ReadingList` gets `anchorVerseKey="2:1"`. Switching back to Mushaf: the container gets `"2:290"` (its own place maps to `2:1`).
5. **Playing** with Warsh chosen: the container gets `mushafKey="hafs"` and the recited Hafs key. After stop (`status` `idle`): `mushafKey="warsh"`, with `anchorVerseKey` the carry of the recited key.
6. The Mushaf page effect writes the Hafs `verses.page`, never the Warsh pack page.
7. **Hafs chosen:** nothing above changes. The existing tests pass unedited.

## Part E. Marks on non-Hafs pages, the toolbar bookmark, and interim guards (Haiku)

### E1. `MushafSvgList.tsx`

- New prop `riwayahHighlightsByVerseKey?: ReadonlyMap<string, HighlightColor>`, documented as «Non-Hafs only: colours (and the saved green) keyed by `surah:ayah` in that riwayah's numbering.»
- In the `highlightByVerseKey` memo: `if (!isHafs) return riwayahHighlightsByVerseKey ?? NO_MARKS;`. Add it to the memo's dependencies.
- `placeKey = placeVerseKey` (drop the `isHafs` gate: the screen now passes the shown riwayah's key).
- `khatmaKey` stays Hafs only: khatma is Hafs (Out of scope).
- `MushafSvgContainer` passes the prop through, because its props are the list's.

### E2. `ReaderScreen.tsx`

```ts
const riwayahHighlights = useRiwayahHighlightsByVerseKey(riwayahShown);
const riwayahSavedKey = useRiwayahBookmarkKey(riwayahShown);
const drawnRiwayahHighlights = useMemo(() => withSavedWash(riwayahHighlights, riwayahSavedKey), [riwayahHighlights, riwayahSavedKey]);
```

- `saved-wash.ts`: make `withSavedWash` generic, `withSavedWash<K>(highlights: ReadonlyMap<K, HighlightColor>, saved: K | null): ReadonlyMap<K, HighlightColor>`, with the body unchanged. The existing call compiles as is.
- Add `riwayahHighlightsByVerseKey: riwayahShown === null ? undefined : drawnRiwayahHighlights` to `mushafShared`.
- **Toolbar bookmark** (lines 268–271 and 443–452): when `riwayahShown !== null`:
  - `bookmarked` is `riwayahSavedKey === shownViewKey`;
  - `onBookmarkPage` runs `const parts = parseVerseKey(shownViewKey); if (parts !== null) toggleRiwayahBookmark({ riwayah: riwayahShown, ...parts });` inside the same `try`.
  - The live hook redraws, so `bookmarkOverride` is not used on this path.
  - The Hafs path is unchanged.

### E3. Interim guards (removed by Part F; until F lands, never let a non-Hafs tap write a Hafs mark)

When `riwayahShown !== null`:

- `mushafShared.onSelectVerseKey` and `onOpenAyahActions` are `undefined`;
- the toolbar's `onAyahActions` is `() => undefined`;
- `AdaptiveReaderLayout panelOpen={selection.panelOpen && riwayahShown === null}`.

Mark each with the comment `// shortcut: no non-Hafs ayah options until step 9 Part F (frame AyahSheetRiwayah); remove there.` **The release (plan step 11) must not ship before Part F.**

### E4. Tests

- **`MushafSvgList.test.tsx`:** replace «non-Hafs key: highlight map empty» with:
  - a non-Hafs list draws `riwayahHighlightsByVerseKey` and ignores `highlightsByVerseId`, so no Hafs id lands on another print;
  - `placeVerseKey` is drawn for a non-Hafs key;
  - with the screen reader on, a non-Hafs ayah with a riwayah colour has the label «surah name + ayah number + colour name» (decision 10 plus the colour). Mock `ayah-label` as its own test does.
- **`ReaderScreen.test.tsx`:**
  - the Warsh saved key gets the green wash;
  - the toolbar bookmark toggles `riwayah_bookmarks`, never `bookmarks`;
  - the E3 guards: a non-Hafs tap calls no `router.push`, and the side panel is closed.

## Part F. Ayah options for a non-Hafs ayah (blocked: frame F1 must be approved)

Build from the approved `core/AyahSheetRiwayah`. Where the frame differs from this text, the frame wins; report the difference.

1. **The selection carries the riwayah.** `selection.ts`:
   - state `riwayah: SvgMushafKey` (initial `'hafs'`);
   - `selectVerse(verseKey, placement, riwayah: SvgMushafKey = 'hafs')` sets it.
2. **Routing.**
   - `ReaderScreen.selectVerse(key)` passes `riwayahShown ?? 'hafs'`.
   - On the sheet placement it pushes `/ayah/${key}?riwayah=${riwayah}` when the riwayah is not Hafs.
   - `app/ayah/[verseKey].tsx` reads `riwayah`, keeps it only if `isSvgMushafKey`, and otherwise uses `'hafs'`. It passes it to `AyahSheetScreen`, then to `SheetContainer`.
   - `SheetContainer` and `AyahPanelContent` render `RiwayahAyahPanel` instead of their Hafs content when the riwayah is not `'hafs'`, with no tabs. The side panel gets it from `selection.riwayah`.
3. **`src/features/reader/panels/RiwayahAyahPanel.tsx` (new, with its test).**
   - Props: `{ ayah: RiwayahAyah; testID?: string }`.
   - Header:
     - `t('reader.ayahPanel.reference', { surah: <chapter name of ayah.surah via getChapter + chapterDisplayName>, ayah: formatNumber(ayah.ayah, locale) })`;
     - `t(\`reader.mushafs.${ayah.riwayah}.name\`)`.
   - `HighlightRow`, bound to `useRiwayahHighlightsByVerseKey` and `setRiwayahHighlight`.
   - Two `ActionTile`s:
     - bookmark, using `reader.ayahPanel.bookmark` / `bookmarked`, `useRiwayahBookmarkKey` and `toggleRiwayahBookmark`;
     - note, using `reader.ayahPanel.note` and opening `NoteEditor`.
   - No text, play, tafsir, repeat, khatma, copy or share.
4. **`NoteEditor`** gains optional props:
   - `onSaveBody?: (body: string) => void` and `onDeleteNote?: (id: string) => void`, which replace `saveNote(verseId, …)` and `deleteNote` when given;
   - `note` widens to `Pick<Note, 'id' | 'body'> | null`.

   The Hafs callers are unchanged.
5. Remove every E3 guard.
6. **Tests:**
   - `RiwayahAyahPanel.test.tsx`: render, a colour press writes `riwayah_highlights` and never `highlights`, bookmark toggles, note save and delete, Arabic and English, roles and labels, no raw hex;
   - route tests for the `riwayah` param, including that an unknown value gives `'hafs'`;
   - a `ReaderScreen` test that a non-Hafs tap pushes `/ayah/2:5?riwayah=warsh`.
7. **Review:** the reviewer compares `RiwayahAyahPanel` with the frame, and takes the iPhone 17 simulator screenshot per root `CLAUDE.md`. The implementer runs no simulator.

## Part G. Reading and Focus say «حفص عن عاصم» while another mushaf is chosen (blocked: frames F2 and F3 must be approved)

- **Condition:** `chosenMushaf !== 'hafs' && (mode === 'reading' || mode === 'focus')`. It uses the **chosen** mushaf, not the shown one.
- **New key `reader.toolbar.withRiwayah`:** ar «{{text}} · {{riwayah}}», en `{{text}} · {{riwayah}}`. `riwayah` is `t('reader.mushafs.hafs.name')`, the existing «حفص عن عاصم» / "Hafs from Asim".
- **`ReaderToolbar.tsx`:**
  - new optional prop `riwayahNote?: string`;
  - when it is set, the title pill's subtitle is `t('reader.toolbar.withRiwayah', { text, riwayah: riwayahNote })`, where `text` is the subtitle it shows today (`readingSubtitle` when `lone`, else `subtitle`);
  - with no subtitle, it shows `riwayahNote` alone.
- **`ReaderScreen`:**
  - passes `riwayahNote` under the condition;
  - wraps `focusPosition` the same way for `FocusChrome`.
- **Tests:** `ReaderToolbar.test.tsx` (compact and expanded, Arabic and English); a `ReaderScreen` test showing the note with Warsh chosen in Reading and Focus, and no note for Hafs or in Mushaf mode.

## Part H. Spec edits (same change as Parts A–E)

`docs/technical-spec.md`:

- **§6, `user.db` table:** add one row:

  > `riwayah_bookmarks`, `riwayah_highlights`, `riwayah_notes` | marks of the other four riwayat (ADR 0090 decision 4): `id` uuid, `riwayah` (`warsh`, `qalun`, `shubah`, `duri`), `surah`, `ayah` in that riwayah's numbering, then `color` or `body` as the Hafs table, and the sync columns | one live bookmark per riwayah; one live highlight per (`riwayah`,`surah`,`ayah`). Hafs marks stay in `bookmarks`, `highlights`, `notes`. Outbox entities `riwayah_bookmark`, `riwayah_highlight`, `riwayah_note`, dormant in v1 (ADR 0027). In `PERSONAL_TABLES`.
- **§12, «Highlights», last sub-bullet («In the other riwayat…»):** extend it with the tables above, and the place:
  - `reader.lastVerseKey` stays the Hafs place everywhere;
  - each other riwayah keeps its own exact place in MMKV `reader.riwayahPlace.<key>`;
  - crossing between riwayat carries the place by surah and ayah number, or to the surah's first ayah.
- **§12, «Other riwayat in other modes»:** add that the place carries as above, and that a non-Hafs choice whose pack is unavailable shows the download card's «unavailable» state, never the flowed Hafs Mushaf.
- Do not edit ADR 0090. Q1–Q4 may need its amendment, which the coordinator writes.

## Spec §11 sync cases and v1 (ADR 0027)

v1 has no push, no pull and no server. `core/sync/user-sync.ts` does not exist, and the API has no user-data tables. The device keeps the invariants that make each case resolvable when sync returns. Each case maps to a test in `riwayah-repository.test.ts`, or is not applicable:

| Spec §11 case | v1 status | Test |
| --- | --- | --- |
| Two devices edit the same note offline | Local invariant: each edit stamps `client_updated_at = now()`, and the outbox keeps exactly one row per `(entity, entity_id)` with the latest payload | Save, then save again: one `upsert` row with the latest body. Editing (save new, delete old) leaves an `upsert` and a `delete` |
| Delete on one device while the other edits | Local invariant: a delete is a tombstone (`deleted_at` set, row kept, outbox `delete`), and re-colouring revives the tombstone's id | Delete a highlight, then colour it again: same `id`, `deleted_at` null, one outbox row with op `upsert` |
| Guest merge with duplicate highlights | Local invariant: one live highlight per `(riwayah, surah, ayah)`; client UUIDs never collide | A second live insert is refused (A5). `setRiwayahHighlight` twice keeps one live row |
| Clock skew of +1 day | Not applicable: the clamp is server-side (§11 server step 2) | None. State it in the report |
| Cursor older than 90 days | Not applicable: pull is server-side | None. State it in the report |
| Push retried after a network drop | Local invariant: the row and its outbox row commit together or not at all, and outbox rows persist with `attempts = 0` | `failOnOutbox` makes each riwayah write roll back both. A committed write leaves its outbox row with `attempts = 0` |

## i18n

- Parts A–E and H add no string. C2 reuses `reader.mushafDownload.error.unavailable`.
- F adds none.
- G adds `reader.toolbar.withRiwayah` (ar «{{text}} · {{riwayah}}», en `{{text}} · {{riwayah}}`) to both `ar.json` and `en.json`.

## Gates (from `/Applications/MAMP/htdocs/quran-app/apps/mobile`; Node 26 through `nvm use`)

```bash
pkill -f jest || true
nice -n 10 npm run lint
nice -n 10 npx tsc --noEmit
nice -n 10 npx jest --maxWorkers=2 src/core/db/user src/features/library/data src/features/reader/anchor src/features/reader/MushafSvgList.test.tsx src/features/reader/components/MushafSvgContainer.test.tsx src/features/reader/screens src/features/onboarding src/core/mushaf-pack src/features/reader/saved-wash.test.ts
nice -n 10 npx jest --maxWorkers=2
```

- Run the full suite once, at the end. `npx expo-doctor` and the audits are not needed, because no dependency changes.
- If a pre-existing test outside these paths fails on the baseline too, say so and don't fix it.

## Machine rules

- No Android emulator, Gradle or Android build. No simulator: the coordinator does the visual check at review (root `CLAUDE.md`, «Visual check»).
- Prefix heavy commands with `nice -n 10`.
- Never run two Jest processes at once. Kill orphans first.
- Stage nothing, commit nothing, push nothing. Don't switch branches.

## Out of scope

- My Quran's bookmarks, highlights and notes tabs list Hafs marks only. Listing non-Hafs marks there needs frames (Q5).
- Khatma, tafsir, audio and the shared current ayah stay Hafs-only (decision 4, «Decided» 1). The khatma marker is never drawn on non-Hafs pages.
- An exact ayah map between riwayat («Decided» 5 waits for a licensed source).
- Deleting a previous edition's pack after a switch (Q7).
- The surah-start haptic on non-Hafs pages (`surahStartPages` is Hafs; the same gap exists for the Hafs pack on its 36 W6 pages).
- Reciter `riwayah` and the reciters list (step 9b).
- API, packs, contract, `design/` hand edits, the Sources credit and website copy (step 10), the release (step 11).

## Report

- Files created, changed and deleted, by part. Confirm that `git status --short` differs from `step9-before.txt` only by them.
- The gate results.
- For each spec §11 case, the test name, or «not applicable in v1» with the reason.
- Whether every E3 guard is in place (or removed, if F was built), and which parts are still blocked on frames.
- Every disagreement between this brief and the code. Stop and report rather than redesign.

## Open questions for the developer (do not decide; put them in the report)

- **Q1. Table shape (gates Parts A and B).** The brief adds `riwayah_bookmarks`, `riwayah_highlights` and `riwayah_notes`, and leaves existing rows in place (Hafs by definition). It does not add a `riwayah` column defaulting to `'hafs'` to the existing tables: that needs a table rebuild to relax `verse_id NOT NULL`, which spec §6 forbids, plus a Hafs filter on every existing reader. Confirm.
- **Q2. Bookmarks.** One bookmark per riwayah (ADR 0028 applied within each riwayah), with Hafs's bookmark unchanged? Or one bookmark across all riwayat?
- **Q3. Carrying the place.** «Decided» 5 is still "proposed" and defines only non-Hafs → Reading. Two parts need confirming:
  - the brief applies it both ways;
  - the brief prefers a riwayah's own saved place while that place maps to the shared Hafs place.
- **Q4. Spec §6 lists `reading_position` and `settings` tables in `user.db`.** The code keeps both in MMKV, and `PERSONAL_TABLES` names two tables that don't exist. Fix the spec to match the code, in a later docs change?
- **Q5. My Quran.** Should its tabs list non-Hafs marks (surah name, ayah number, riwayah name, opening the Mushaf on that riwayah)? That needs frames.
- **Q6. Models.** The developer rule gives every part to Haiku, and the plan names Opus only for writing this brief. The brief recommends Opus for A and B (a hand-written migration that runs once on every device) and asks the same for D (five paths in `ReaderScreen`). Which parts go to a stronger model?
- **Q7. Old packs.** Switching edition keeps the previous pack on disk (about 60–90 MB each). Should switching offer to remove it, or should that wait for a storage screen?
- **Q8. Juz on non-Hafs pages.** The page dividers (step 7) and the toolbar show the Hafs juz of the same-numbered ayah, which is approximate. Show the page only on non-Hafs pages?
- **Q9. The Hafs place's page.** A hand scroll on non-Hafs pages writes `verses.page`, not the Hafs pack's page. They differ by one on 36 pages (W6). Acceptable, or read the Hafs pack when it is installed?
- **Q10. Playing without the Hafs pack.** A Warsh reader who plays audio sees the Hafs download card in place of the pages (decision 12 shows Hafs pages). The brief stops it from auto-downloading (C1). Should it instead keep the Warsh pages, unfollowed, until the Hafs pack exists? This is shared with step 9b.
- **Q11. The frames F1–F3.** Approve the designs, including that F1 has no explanatory line about the missing tafsir and audio actions.

## Decisions on the open questions (coordinator, 15 Nov 2026)

- **Q1:** accepted. Three new tables hold the other four riwayat. Existing rows stay as they are: they are Hafs, and the migration is additive.
- **Q2:** one bookmark per riwayah. This is consistent with ADR 0028 (one bookmark) and ADR 0090 decision 4.
- **Q3: the developer decides.** The question is whether to carry the place over in both directions, and whether a riwayah's own saved place wins. Parts A–C and E may go ahead; Part D waits for the answer.
- **Q4:** spec §6 is changed to match the code: the place and the reader settings live in MMKV. Add this to Part H.
- **Q5: the developer decides** whether My Quran lists non-Hafs marks. Until then, My Quran lists Hafs marks only, and non-Hafs marks show on their own pages and in their toolbar bookmark.
- **Q6:** Parts A and B use a stronger model (Opus), because the hand-written migration runs once on every device. Parts C, D, E, F and G use Haiku.
- **Q7:** no prompt to delete the old pack in this step. That is out of scope.
- **Q8:** non-Hafs pages show no juz, so no Hafs juz number appears on a non-Hafs page. Pages show the surah and the page number only.
- **Q9:** Mushaf mode uses the pack's page mapping, as step 7 decided; `verses.page` stays elsewhere.
- **Q10:** a reader on another riwayah who plays a Hafs recitation sees the Hafs pack's download card when that pack is missing. The download starts automatically when the downloads setting allows it. This matches step 9b Q2.
- **Q11:** the frames are drawn first. F1–F3 and F4 (the Mushaf title while playback shows Hafs, from 9b Q6) are with the developer for approval. Parts F and G wait for that approval.

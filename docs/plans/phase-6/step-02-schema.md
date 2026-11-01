# Step 2 — Azkar schema and pack contract

ADR 0031 §3, §4, §6, §8, §9. **No production content is written in this step.**

## Goal
Add the canonical Azkar tables (MySQL mirror, pack, `content.db`), the `azkar` pack group in the shared contract with its rights gate, and the personal tables in `user.db`. The API and the app must agree column for column.

## Canonical tables (identical names and columns in MySQL, the pack and `content.db`)

Every table has `resource_id` (int, not null) first. Integers are SQLite `integer`; text is `text`. "null" marks nullable columns; every other column is not null.

| Table | Columns (in order) | Primary key / indexes |
| --- | --- | --- |
| `azkar_chapters` | `resource_id`, `id` int, `source_chapter_id` text, `number` int, `title_ar` text null, `title_en` text null | PK (`resource_id`,`id`) |
| `azkar_entries` | `resource_id`, `id` int, `entry_key` text, `chapter_id` int, `position` int, `source_reference` text, `entry_type` text, `occasion` text null, `timing_type` text null, `timing_prayer` text null, `timing_policy_id` text null, `review_status` text, `source_version` text, `imported_at` int | PK (`resource_id`,`id`); unique `entry_key`; index (`resource_id`,`chapter_id`,`position`) |
| `azkar_items` | `resource_id`, `id` int, `entry_id` int, `item_key` text, `variation_key` text, `position` int, `kind` text, `required_count` int null, `speaker` text null, `source_dua_id` text null, `text_en` text null, `transliteration` text null, `source_text_sha256` text null | PK (`resource_id`,`id`); unique `item_key`; index (`resource_id`,`entry_id`,`variation_key`,`position`) |
| `azkar_segments` | `resource_id`, `item_id` int, `position` int, `kind` text, `text_ar` text null, `quran_surah` int null, `quran_verse_from` int null, `quran_verse_to` int null, `text_search` text null | PK (`resource_id`,`item_id`,`position`) |
| `azkar_categories` | `resource_id`, `id` text, `kind` text, `position` int, `occasion` text null, `progress_period` text | PK (`resource_id`,`id`) |
| `azkar_entry_categories` | `resource_id`, `category_id` text, `entry_id` int, `variation_key` text, `position` int | PK (`resource_id`,`category_id`,`entry_id`,`variation_key`) |
| `azkar_notes` | `resource_id`, `id` int, `entry_id` int, `item_id` int null, `kind` text, `text_ar` text null, `text_en` text null, `grader` text null, `source_type` text, `source_name` text, `source_reference` text null, `source_url` text null, `review_status` text | PK (`resource_id`,`id`); index (`resource_id`,`entry_id`) |
| `azkar_recordings` | `resource_id`, `id` int, `recording_key` text, `item_id` int, `reciter_name` text, `reciter_name_ar` text null, `source` text, `remote_url` text, `duration_ms` int, `size_bytes` int null, `stream_allowed` int, `download_allowed` int, `redistribution_allowed` int, `attribution_ar` text null, `attribution_en` text null, `licence` text, `licence_url` text null, `rights_verified_at` int null | PK (`resource_id`,`id`); unique `recording_key`; index (`resource_id`,`item_id`) |

Allowed values, enforced by PHP and TS enums, not by SQL checks:
- `entry_type`: `invocation` | `instruction` | `narration`
- `items.kind`: `recitation` | `instruction` | `narration`
- `segments.kind`: `text` | `quran`
- `review_status`: `sourced` | `reviewed`
- `timing_type`: `time_period` | `prayer_based` | `event_based` | `anytime`
- `timing_prayer`: `fajr` | `dhuhr` | `asr` | `maghrib` | `isha`
- `categories.kind`: `session` | `browse`
- `progress_period`: `daily` | `nightly` | `per_prayer` | `session`
- `notes.kind`: `explanation` | `context` | `virtue` | `reference` | `grade`
- `occasion`: `morning` | `evening` | `after_prayer` | `before_sleep` | `after_waking` | `entering_home` | `leaving_home` | `entering_mosque` | `leaving_mosque` | `travel` | `general`
- `azkar_entry_categories.variation_key = '*'` means every variation.

Text columns that carry religious text (`text_ar`, `text_en`, `transliteration`) are stored byte-for-byte: no trim, no normalisation. Only `text_search` is normalised (spec §7 rules).

## Personal tables (`user.db`, local only, additive migration)

| Table | Columns | Keys |
| --- | --- | --- |
| `azkar_favorites` | `entry_key` text, `created_at` int | PK `entry_key` |
| `azkar_progress` | `scope_key` text, `period_key` text, `item_key` text, `current_count` int default 0, `completed_at` int null, `updated_at` int | PK (`scope_key`,`period_key`,`item_key`); index (`scope_key`,`period_key`) |
| `azkar_reminders` | `id` text, `target_type` text (`category` \| `entry`), `target_key` text, `enabled` int, `trigger_type` text (`clock` \| `prayer_relative`), `clock_time` text null (`HH:MM`), `prayer` text null, `offset_minutes` int null, `notification_ids` text null (JSON array), `updated_at` int | PK `id`; unique (`target_type`,`target_key`) |

No sync columns (ADR 0027). All three join `PERSONAL_TABLES` in `src/core/db/user/clear.ts`.

## API (Laravel)
- Migrations for the 8 canonical tables (utf8mb4, `utf8mb4_0900_ai_ci`, InnoDB, as the existing content migrations; FK `resource_id → resources.id` cascade on delete). Text columns that hold religious text use `text`/`mediumText`, never `string` (no truncation).
- Insert-only migration seeding the `opendua` row in `content_sources`:
  - `permission_status = pending`.
  - `licence_url` = `https://opendua.hdfund.org/developers#dev-licence`.
  - `attribution_en` = the verbatim OpenDua attribution line from `phase-6/source-research.md` §3.
  - `attribution_ar` = **empty string**, with a `notes` line "Arabic attribution pending OpenDua's wording". We do not translate their attribution.
- `ResourceGroup::Azkar` and `ServedResourceGroup::Azkar` (`azkar`). `PackSchema::tablesFor(Azkar)` returns the 8 tables with primary keys and `orderBy`.
- **Rights gate:** building a pack, or listing a resource in the manifest, for a resource whose `content_sources.permission_status` is not `granted` or `not_required` must not happen. The builder throws `PackBuildException`; the manifest omits the resource. Tests cover both.
- Regenerate the contract: `npm run generate -w @quran/api-contract`, then commit `openapi.json` and `schema.d.ts`.

## App
- `src/core/db/content/schema.ts`: Drizzle tables matching the contract. Then `npm run db:generate` for migration `0008_*`.
- `src/core/sync/content-tables.ts`: an `azkar` group with the 8 tables in this column order. Entities: one per table, keyed by its non-`resource_id` primary key, with `DELETE … AND resource_id = ?`. `deleteResourceSql` deletes children before parents. `PackGroup` gains `'azkar'`.
- `src/core/db/user/schema.ts`: the 3 personal tables. Then `npm run db:generate:user` for migration `0004_*`. Update `PERSONAL_TABLES`.
- Selection (`src/core/sync/selection.ts`): an `azkar` resource listed in the manifest is installed automatically (no user choice). Absent from the manifest, it is never requested.

## Tests
- API (Pest): migrations up and down; the `PackSchema` azkar tables; the pack builder refuses a `pending` source; the manifest omits a `pending` source; the contract test for the new group (follow `ContentHandlersTest` and `PackBuilderTest`).
- App (Jest): content migration creates the 8 tables with these columns; `contentContract()` includes `azkar`; user migration creates the 3 tables; `clearLocalUserData` empties them; selection installs `azkar` when listed and never when absent.

# Step 2 — Mirror schema, first part (API)

Follow [README.md](README.md). Needs step 1 committed. Read also:
- Spec §5 (the tables below are its Phase 1 shape, ADR 0009).
- [ADR 0008](../../adr/0008-phase-1-content-decisions.md) and [ADR 0009](../../adr/0009-phase-1-mirror-schema.md).
- `apps/api/tests/Unit/MigrationCompatibilityTest.php`. No `md5()`/`sha1()` in migrations.

**Goal:** migrations, models and a seeder for the content tables we can fill from QF prelive now.
- **No sync logic.** That's step 3.
- **Not yet created:** `chapters`, `verses`, `words` (step 9, when `quran_core` access exists). So `verse_id` and `word_id` columns here are plain integers, **without** foreign keys to those tables.

## Domain and location

- **Domain:** `app/Domains/Content/` (new).
- **Models:** `app/Domains/Content/Models/`, one per table, with `$casts` (JSON columns to arrays, datetimes to `CarbonImmutable`) and the relations listed below.
- **Factories:** `database/factories/` for `Resource`, `TranslationEntry`, `TafsirEntry`, `Mushaf`, `WordLayout`, `Recitation`, `ChapterAudioFile`. Translation parts removed by ADR 0014 (28 Oct 2026).
- **Service provider:** `app/Domains/Content/ContentServiceProvider.php`, registered in `bootstrap/providers.php`. Empty for now: no routes or bindings yet.
- **Enum:** `app/Domains/Content/Enums/ResourceGroup.php`, backed by these strings: `quran_core`, `mushafs`, `translations`, `tafsirs`, `word_by_word_translations`, `word_by_word_transliterations`, `recitations`, `chapter_recitations`, `hadith`. The translation cases stay as ignored (ADR 0014).

## Tables

**Enumerated columns are `varchar` plus a PHP backed enum cast, not MySQL `ENUM`** (ADR 0009). The `enum(…)` lists below give the allowed values.

All InnoDB, `utf8mb4`. Default collation `utf8mb4_0900_ai_ci`. **Columns marked "bin" use `utf8mb4_0900_bin`**, because they hold Quran or QF text stored byte for byte. Timestamps are `datetime(6)`. Each table gets its own migration file, in this order.

**`content_sources`:**
- `id` bigint PK
- `code` varchar(32) unique
- `name` varchar(120)
- `licence_url` varchar(500)
- `attribution_ar` text
- `attribution_en` text
- `permission_status` enum(`granted`,`pending`,`not_required`,`denied`)
- `notes` text null
- timestamps

**`resources`:**
- `id` bigint PK
- `source_id` FK → `content_sources`
- `group` enum (the `ResourceGroup` values)
- `source_key` varchar(64): the QF `resource_id` as a string
- `source_content_id` bigint unsigned null: the QF `resource_content_id`
- `name` varchar(200) null
- `author_name` varchar(200) null
- `language_name` varchar(40) null
- `language_code` varchar(8) null
- `direction` enum(`rtl`,`ltr`) null
- `version` int unsigned default 0
- `changes_floor_version` int unsigned default 0
- `source_sequence` bigint unsigned null
- `checksum` char(64) null
- `is_active` bool default true
- `unavailable_reason` varchar(255) null
- `synced_at` datetime(6) null
- timestamps
- Unique (`source_id`,`group`,`source_key`); index (`group`,`language_code`).

**`sync_states`:**
- `id`
- `environment` enum(`prelive`,`production`)
- `resource_group` varchar(48)
- `resources_filter` varchar(255)
- `sync_token` text null
- `last_sequence` bigint unsigned default 0
- `last_success_at` datetime(6) null
- `last_error` text null
- timestamps
- Unique (`environment`,`resource_group`).

**`sync_runs`:**
- `id`
- `environment` enum(`prelive`,`production`)
- `resource_group` varchar(48)
- `started_at` datetime(6)
- `finished_at` datetime(6) null
- `status` enum(`running`,`ok`,`failed`)
- `mutations_applied` int unsigned default 0
- `error` text null
- Index (`resource_group`,`started_at`).

**`content_changes`:**
- `id` bigint auto-increment PK (the device cursor)
- `resource_id` FK cascade
- `version` int unsigned
- `entity` varchar(32)
- `entity_key` varchar(64)
- `op` enum(`upsert`,`delete`)
- `payload` json null
- `created_at` datetime(6)
- Index (`resource_id`,`id`); index `created_at`.

**`content_packs`:**
- `id`
- `resource_id` FK cascade
- `version` int unsigned
- `path` varchar(500)
- `size_bytes` bigint unsigned
- `sha256` char(64)
- `row_count` int unsigned
- `schema_version` smallint unsigned
- `built_at` datetime(6)
- Unique (`resource_id`,`version`).

**`translation_entries`:** Translation parts removed by ADR 0014 (28 Oct 2026).
- `resource_id` FK cascade
- `verse_id` smallint unsigned
- `verse_key` varchar(7)
- `text` text **bin**
- `footnotes` json null
- `source_record_id` bigint unsigned null
- PK (`resource_id`,`verse_id`); index `verse_id`.

**`tafsir_entries`:**
- `id` bigint PK
- `resource_id` FK cascade
- `group_tafsir_id` bigint unsigned
- `first_verse_id` smallint unsigned
- `last_verse_id` smallint unsigned
- `first_verse_key` varchar(7)
- `last_verse_key` varchar(7)
- `html` mediumtext **bin** (sanitized in step 4)
- `source_hash` char(64)
- Unique (`resource_id`,`group_tafsir_id`); index (`resource_id`,`first_verse_id`,`last_verse_id`).

**`mushafs`:**
- `id` smallint unsigned PK: the QF mushaf id, not auto-increment
- `resource_id` FK cascade unique
- `name` varchar(120)
- `description` text null
- `pages_count` smallint unsigned
- `lines_per_page` tinyint unsigned
- `default_font_name` varchar(32) null
- `mapping_mode` varchar(32) null
- `qirat_name` varchar(32) null

**`mushaf_pages`:**
- `mushaf_id` FK → `mushafs` cascade
- `page_number` smallint unsigned
- `first_verse_id` smallint unsigned
- `last_verse_id` smallint unsigned
- `first_word_id` int unsigned
- `last_word_id` int unsigned
- `verses_count` smallint unsigned
- `verse_mapping` json
- PK (`mushaf_id`,`page_number`).

**`word_layouts`:**
- `mushaf_id` FK → `mushafs` cascade
- `word_id` int unsigned
- `verse_id` smallint unsigned
- `position_in_verse` smallint unsigned
- `char_type` varchar(16)
- `glyph` varchar(32) **bin** (QCF glyph code, stored byte for byte)
- `page` smallint unsigned
- `line` tinyint unsigned
- `position_in_line` smallint unsigned
- PK (`mushaf_id`,`word_id`); index (`mushaf_id`,`page`,`line`); index `verse_id`.

**`recitations`:**
- `id` bigint PK
- `resource_id` FK cascade unique
- `reciter_name` varchar(200) null
- `reciter_name_ar` varchar(200) null
- `style` varchar(32) null
- `qirat` varchar(32) null
- `has_word_segments` bool default false

**`chapter_audio_files`:**
- `id` bigint unsigned PK: the QF id, not auto-increment
- `recitation_id` FK cascade
- `chapter_id` tinyint unsigned
- `audio_url` varchar(500)
- `size_bytes` bigint unsigned null
- `duration_ms` int unsigned
- `format` varchar(8)
- Unique (`recitation_id`,`chapter_id`).

**`recitation_timings`:**
- `audio_file_id` FK → `chapter_audio_files` cascade
- `verse_id` smallint unsigned
- `verse_key` varchar(7)
- `start_ms` int unsigned
- `end_ms` int unsigned
- `segments` json null
- PK (`audio_file_id`,`verse_id`)
- Add the MySQL check `start_ms < end_ms` with a raw statement.

**Relations:**
- `Resource` hasMany `TranslationEntry`, `TafsirEntry`, `ContentChange` and `ContentPack`; hasOne `Mushaf` and `Recitation`; belongsTo `ContentSource`. Translation parts removed by ADR 0014 (28 Oct 2026).
- `Mushaf` hasMany `MushafPage` and `WordLayout`.
- `Recitation` hasMany `ChapterAudioFile`.
- `ChapterAudioFile` hasMany `RecitationTiming`.
- Composite primary keys: set `$incrementing = false` and use upserts in later steps. No Eloquent composite-key packages.

## Seeder

`ContentSourceSeeder`, which is idempotent (`updateOrCreate` on `code`), called from `DatabaseSeeder`:

| `code` | `name` | `licence_url` | `permission_status` | `attribution_en` / `attribution_ar` |
| --- | --- | --- | --- | --- |
| `qf` | Quran Foundation | `https://api-docs.quran.foundation/legal/developer-terms/` | `granted` | `Quran content from Quran Foundation (quran.foundation)` / `محتوى القرآن من مؤسسة القرآن (quran.foundation)` |
| `tanzil` | Tanzil Project | `https://tanzil.net/docs/text_license` | `not_required` | `Quran text from the Tanzil Project (tanzil.net), CC BY 3.0` / `نص القرآن من مشروع تنزيل (tanzil.net)، برخصة CC BY 3.0` |

## Tests

`tests/Feature/Content/MirrorSchemaTest.php`, MySQL with `RefreshDatabase`:
- **Migrations:** they run, and the seeder is idempotent (run twice → 2 rows).
- **Collation:** every column marked **bin** has collation `utf8mb4_0900_bin` (query `information_schema.COLUMNS`), and no other text column does.
- **Byte-exact round trip:**
  - The test string is `"ٱلرَّحْمَـٰنِ ۞ \u{200F}ﱁ  end "` (diacritics, tatweel, rub mark, an RLM, a QCF glyph, a double space and a trailing space).
  - Write it to `translation_entries.text`, `tafsir_entries.html` and `word_layouts.glyph`, then read each back. Translation parts removed by ADR 0014 (28 Oct 2026).
  - Assert `bin2hex` equality, in each case.
- **Unique constraints:** `resources` (`source_id`,`group`,`source_key`) and `tafsir_entries` (`resource_id`,`group_tafsir_id`) reject duplicates.
- **Cascade:** deleting a `Resource` removes its translation, tafsir, mushaf (with pages and layouts) and recitation (with files and timings) rows. Translation parts removed by ADR 0014 (28 Oct 2026).
- **Check constraint:** `recitation_timings` rejects `start_ms >= end_ms`.
- **Arch:** add a rule that `App\Domains\Content\Models` classes extend `Illuminate\Database\Eloquent\Model`. The existing rules stay green.

## Verify

`composer qa`, then `php artisan migrate` and `php artisan db:seed --class=ContentSourceSeeder` on the local database. Both must succeed and stay idempotent.

## Leave untouched

`app/Integrations` (step 1's code), `app/Domains/Sync`, `apps/mobile`, `packages/`, the Phase 0 migrations, and `composer.json` (no packages).

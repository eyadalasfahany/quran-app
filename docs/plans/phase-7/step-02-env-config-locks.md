# Step 2 — Env, config, kill switch, source rows

ADR 0042 §3, §4, §4a, §10 (Proposed until the developer's acceptance is recorded). Plan: `docs/plans/phase-7.md` (step 2 row, its tests row, D3, D4, D6, D9, "Titles data"). Read `docs/plans/phase-7/README.md` and `.claude/agent-rules.md` first. **No hadith text of any kind is written in this step.** The only Arabic strings are the ten collection names and the author names listed below; they are config data, not hadith text.

## Goal
Put the Phase 7 switches and pins in place with no behaviour yet: the env lines, `config/hadith.php`, `config/hadith_titles.php`, the two `content_sources` rows, and one small kill-switch class that later steps call. No table, endpoint, pack, importer or HTTP client is added here.

## Rules for this step
- Branch: `ft/hadith`. Check with `git branch --show-current`. Do not commit, push, switch branches or add dependencies.
- **Never open, print or edit `apps/api/.env`.** Only `.env.example` is touched.
- Shared files are edited additively and at the end (`.env.example`, `SourcePermissionCommand.php`).
- Follow the patterns of `config/azkar.php`, the Azkar `content_sources` migrations and `tests/Feature/Content/AzkarMigrationTest.php`. Laravel code follows `apps/api/CLAUDE.md` (strict types, full typing, domain exceptions, `.ai/rules/*`).
- `docs/technical-spec.md`, ADR 0042 and `docs/plans/phase-7.md` are edited by someone else. Do not touch them.

## Files

Create:

| Path | Purpose |
| --- | --- |
| `apps/api/config/hadith.php` | pin, kill switch, collections, grades constant |
| `apps/api/config/hadith_titles.php` | collection names, authors, empty section titles |
| `apps/api/app/Domains/Hadith/Services/HadithKillSwitch.php` | the kill-switch gate |
| `apps/api/app/Domains/Hadith/Exceptions/HadithCollectionsDisabledException.php` | thrown by the gate |
| `apps/api/database/migrations/2026_11_01_110001_insert_fawazahmed0_content_source.php` | source row |
| `apps/api/database/migrations/2026_11_01_110002_insert_sunnahcom_content_source.php` | source row |
| `apps/api/tests/Feature/Hadith/HadithKillSwitchTest.php` | truth table |
| `apps/api/tests/Feature/Hadith/HadithEnvExampleTest.php` | `.env.example` lines |
| `apps/api/tests/Feature/Hadith/HadithConfigTest.php` | `config/hadith.php` shape and API key |
| `apps/api/tests/Feature/Hadith/HadithTitlesConfigTest.php` | `config/hadith_titles.php` validity |
| `apps/api/tests/Feature/Hadith/HadithSourceMigrationTest.php` | the two source rows |

Change:

| Path | Change |
| --- | --- |
| `apps/api/.env.example` | replace the `HADITH_API_KEY="hADITH_API_KEY"` line; add the flag (see below) |
| `apps/api/app/Domains/Azkar/Console/SourcePermissionCommand.php` | accept `--source=sunnahcom` (see below) |
| `apps/api/tests/Feature/Azkar/SourcePermissionCommandTest.php` | add two tests (see below) |

The migration timestamps (`2026_11_01_11xxxx`) are deliberately outside Azkar's `1000xx` series so the two branches do not collide on merge. Do not renumber.

The `app/Domains/Hadith/` directory exists and holds only `.gitkeep`. Leave `.gitkeep` in place. No service provider is needed in this step (the gate is a plain class that reads config).

## `.env.example`

Replace the existing last line `HADITH_API_KEY="hADITH_API_KEY"` (currently at the end of the file, after the OpenDua block) with exactly these lines, in this order:

```
# Hadith collections (ADR 0042). Kill switch: false here; production sets it to true at release (Phase 7 step 17).
HADITH_COLLECTIONS_IMPORT_ENABLED=false
# dev-only, used by hadith:match-section-titles
HADITH_API_KEY=
```

Rules: `HADITH_API_KEY=` has no value and no quotes. The comment line directly above it is exactly `# dev-only, used by hadith:match-section-titles`. Each variable appears once. The old placeholder text must be gone. Do not add any other hadith variable (no primary-source env, no per-collection env).

## `config/hadith.php`

Same style as `config/azkar.php` (`declare(strict_types=1);`, `return [...]`, a blank line after `[`). Keys, in this order:

```php
return [

    'source_code' => 'fawazahmed0',
    'primary_source' => 'fawazahmed0',

    'commit' => 'df57907be35291c91ad6a6691180e22ca9920784',
    'cdn_base' => 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api',

    'import_enabled' => (bool) env('HADITH_COLLECTIONS_IMPORT_ENABLED', false),

    'grades_visible' => false,

    'collections' => [
        'bukhari', 'muslim', 'abudawud', 'tirmidhi', 'ibnmajah',
        'nasai', 'malik', 'nawawi', 'qudsi', 'dehlawi',
    ],

    'slug_map' => [],

    'reference_exceptions' => [],

    'files' => [ /* see below */ ],

    'api_key' => /* see below */,

];
```

Rules for each key (these are the exact values; do not change them):
- `commit`: the full 40-character SHA above. The string `@1` must not appear anywhere in the file. `cdn_base` has no `@` and no trailing slash; step 5 builds `{cdn_base}@{commit}/...`.
- `import_enabled`: the kill switch. Default `false`. It is the only lock (no `approved_collections`, no reviewer list; the key `approved_collections` must not exist anywhere in the file).
- `grades_visible`: a literal `false`, **not** read from env (D4). Only a developer edit changes it.
- `collections`: exactly the ten slugs, in this order. The index plus one is the collection's fixed position, used for the «مجموعة {n}» fallback (ADR 0042 §4). Format it one slug per line if Pint reformats it.
- `slug_map`: empty array. Maps a source's slug to the canonical one; used by `SunnahComSource` in step 18.
- `reference_exceptions`: empty array. Developer-decided exceptions to the section-range versus `reference.book` check (step 6). Empty means none.
- `files`: the pinned file map, path relative to the repository root of fawazahmed0/hadith-api mapped to its lowercase hex SHA-256, **or `null` until recorded**. Placeholder rule: every value is `null` in this step; step 5 (`hadith:snapshot`) prints the real hashes and the developer approves filling them in. Exactly these twelve keys, in this order: `editions.json`, `info.json`, then `editions/ara-bukhari.json`, `editions/ara-muslim.json`, `editions/ara-abudawud.json`, `editions/ara-tirmidhi.json`, `editions/ara-ibnmajah.json`, `editions/ara-nasai.json`, `editions/ara-malik.json`, `editions/ara-nawawi.json`, `editions/ara-qudsi.json`, `editions/ara-dehlawi.json`. The edition file names follow the plan's `ara-{c}` pattern with `{c}` equal to the slug; step 5 confirms them against `editions.json` and reports any difference instead of guessing. Add a short PHPDoc/comment above the key: `null` means "not yet recorded", and step 5's verifier must refuse a download while a value is `null` outside tests.
- `api_key`: optional, dev-only (ADR 0042 §3, §4a). The value is `null` whenever `env('APP_ENV')` is `'production'`, and otherwise the value of `HADITH_API_KEY` when it is a non-empty string, else `null`. Write it as a single expression, for example:

```php
'api_key' => env('APP_ENV') === 'production'
    ? null
    : (is_string(env('HADITH_API_KEY')) && env('HADITH_API_KEY') !== '' ? env('HADITH_API_KEY') : null),
```

An empty `HADITH_API_KEY=` therefore gives `null`. Nothing in this step reads the key; only `hadith:match-section-titles` (step 6) will, and it never prints it.

## `config/hadith_titles.php`

Data only, no logic. Shape:

```php
return [

    'collections' => [
        'bukhari' => [
            'title_ar' => '…',
            'title_ar_source' => 'ummahapi.com',
            'author_ar' => '…',            // or null
            'author_ar_source' => 'developer',   // or null when author_ar is null
            'author_ar_status' => 'approved',             // or null when author_ar is null
        ],
        // … the ten slugs in the order of config('hadith.collections')
    ],

    'sections' => [],

];
```

- `sections` is an empty array in this step. The proposal from `hadith:match-section-titles` (step 6) is approved by the developer and committed here later, keyed by collection slug then fawazahmed0 section number as a string.
- Exactly the ten slugs under `collections`, in the plan's order. Each entry has exactly the five keys above.
- `title_ar_source` is the string `ummahapi.com` on every entry.
- `author_ar_source` is `developer` and `author_ar_status` is `approved` on every entry that has an author (the developer approved the drafted authors by accepting the defaults on 1 Nov 2026; see Open questions). `qudsi` has `author_ar`, `author_ar_source` and `author_ar_status` all `null` (several compilers).
- Values, copied byte for byte from `docs/plans/phase-7.md` "Titles data" (copy from the file with the editor, never retype or normalise; no trimming, no diacritics added or removed):

| Slug | `title_ar` | `author_ar` |
| --- | --- | --- |
| `bukhari` | صحيح البخاري | الإمام محمد بن إسماعيل البخاري |
| `muslim` | صحيح مسلم | الإمام مسلم بن الحجاج النيسابوري |
| `abudawud` | سنن أبي داود | الإمام أبو داود سليمان بن الأشعث السجستاني |
| `tirmidhi` | جامع الترمذي | الإمام أبو عيسى محمد بن عيسى الترمذي |
| `ibnmajah` | سنن ابن ماجه | الإمام محمد بن يزيد ابن ماجه القزويني |
| `nasai` | سنن النسائي | الإمام أحمد بن شعيب النسائي |
| `malik` | موطأ مالك | الإمام مالك بن أنس |
| `nawawi` | الأربعون النووية | الإمام يحيى بن شرف النووي |
| `qudsi` | الأحاديث القدسية | `null` |
| `dehlawi` | الأربعون لولي الله الدهلوي | الإمام شاه ولي الله الدهلوي |

No English names here (`title_en` comes from the fawazahmed0 data at import time). No hadith text, grade or section name.

## Kill-switch gate

One class, one exception. The same flag gates every environment; it is not an environment check.

`App\Domains\Hadith\Exceptions\HadithCollectionsDisabledException`: `final class … extends RuntimeException {}` with a one-line PHPDoc ("The Hadith kill switch is off; nothing is imported, packed or listed (ADR 0042 §3)."), like `CatalogueDownloadException`.

`App\Domains\Hadith\Services\HadithKillSwitch` (`final`, no constructor, no state):

```php
public function isOn(): bool          // (bool) config('hadith.import_enabled', false)
public function assertOn(): void      // throws HadithCollectionsDisabledException when off
public function offReason(): string   // 'HADITH_COLLECTIONS_IMPORT_ENABLED is false (hadith.import_enabled). The Hadith kill switch is off (ADR 0042 §3).'
```

`assertOn()` throws with `offReason()` as the message. No environment check, no `app()->isProduction()`, no cache, no database.

**Where it is called:** nowhere in this step (nothing to gate yet). Later steps call it, and this brief fixes the contract so they do not invent another gate: step 4 (pack builder and manifest), step 6 (`hadith:import`, which prints `offReason()` and exits 0 under `--if-unlocked`), step 7 (`/hadith/collections*`, which answers 404 `hadith_collection_unavailable`). Do not add any call in this step.

## `content_sources` rows (migrations)

Copy the pattern of `2026_10_31_100009_insert_opendua_content_source.php`: anonymous `Migration`, `private const string CODE`, `up()` returns early when the code exists, inserts with `DB::table('content_sources')->insert([...])` and `now()` for `created_at` and `updated_at`; `down()` deletes only that code. Table columns: `code`, `name`, `licence_url`, `attribution_ar`, `attribution_en` (both not null), `permission_status`, `notes`, `created_at`, `updated_at`. Add no column.

`2026_11_01_110001_insert_fawazahmed0_content_source.php` (`CODE = 'fawazahmed0'`):

| Column | Value |
| --- | --- |
| `name` | `fawazahmed0/hadith-api` |
| `licence_url` | `https://github.com/fawazahmed0/hadith-api/blob/df57907be35291c91ad6a6691180e22ca9920784/LICENSE` |
| `attribution_ar` | `المصدر: fawazahmed0/hadith-api (الترخيص: Unlicense)` |
| `attribution_en` | `Source: fawazahmed0/hadith-api (Unlicense)` |
| `permission_status` | `not_required` |
| `notes` | `Unlicense from the repository author. Edition metadata lists the author as "Unknown"; References.md lists upstream sites (sunnah.com, al-maktaba.org/Shamela and others), and the Unlicense does not by itself clear those upstream rights. Accepted by the developer for now (ADR 0042 §3, RB13). Grades are stored and hidden (hadith.grades_visible = false). Pinned commit df57907be35291c91ad6a6691180e22ca9920784.` |

`2026_11_01_110002_insert_sunnahcom_content_source.php` (`CODE = 'sunnahcom'`):

| Column | Value |
| --- | --- |
| `name` | `Sunnah.com` |
| `licence_url` | `https://sunnah.com/developers` |
| `attribution_ar` | `` (empty string, as OpenDua's: we do not write their attribution) |
| `attribution_en` | `Sunnah.com` |
| `permission_status` | `pending` |
| `notes` | `API key requested 1 Nov 2026. Written terms not yet received. The long-term source (ADR 0042 §8); a later migration sets this to granted after the developer reads the terms (the ADR 0038 pattern).` |

Both wordings of `attribution_*` and `notes` are the plan's recommended defaults; the developer can change them (open question 4 in the plan). Do not "improve" them.

## Command change: `SourcePermissionCommand`

File: `apps/api/app/Domains/Azkar/Console/SourcePermissionCommand.php`. Smallest possible edit so the plan's "production refuses to change a source status from the command line" test has a hadith source to point at:
- Where it resolves the code, replace `$requested === 'hadeethenc' ? 'hadeethenc' : $sources->for($requested)->code()` with `in_array($requested, ['hadeethenc', 'sunnahcom'], true) ? $requested : $sources->for($requested)->code()`.
- Add `, sunnahcom` to the `--source` option description list.
- Nothing else changes. `fawazahmed0` is **not** accepted (its status is `not_required` and the command cannot set that). The production refusal (`app()->isProduction()` at the top of `handle()`) stays the first check.

## Tests (Pest, `declare(strict_types=1)`, placeholders only)

All under `apps/api/tests/Feature/Hadith/` (they extend `TestCase` through `Pest.php`). Use unique helper function names prefixed `hadith…` (Pest helpers are global).

**`HadithKillSwitchTest.php`** (the truth table). `afterEach`: `app()->detectEnvironment(fn (): string => 'testing');` and restore `config(['hadith.import_enabled' => false])`.
- `it('mirrors the flag in every environment', …)` with a `dataset` of environments `local`, `testing`, `staging`, `production` crossed with flag `true` and `false` (eight cases, e.g. `foreach` over both arrays or a combined dataset). For each: `app()->detectEnvironment(fn (): string => $env)`, `config(['hadith.import_enabled' => $flag])`; assert `(new HadithKillSwitch)->isOn()` is `$flag`; assert `assertOn()` does not throw when `true` and throws `HadithCollectionsDisabledException` with message from `offReason()` when `false`.
- `it('is off when the key is missing from config', …)`: `config(['hadith.import_enabled' => null])` gives `isOn() === false`.
- `it('offReason names the variable and the config key', …)`: the string contains `HADITH_COLLECTIONS_IMPORT_ENABLED` and `hadith.import_enabled`.

**`HadithEnvExampleTest.php`**. Read only `base_path('.env.example')` with `file_get_contents`; split with `preg_split('/\R/', …)`. Never read `.env`.
- `it('has HADITH_API_KEY empty with the dev-only comment directly above', …)`: exactly one line starts with `HADITH_API_KEY`, it equals `HADITH_API_KEY=`, and the line before it equals `# dev-only, used by hadith:match-section-titles`.
- `it('has the kill switch false', …)`: exactly one line starts with `HADITH_COLLECTIONS_IMPORT_ENABLED`, and it equals `HADITH_COLLECTIONS_IMPORT_ENABLED=false`.
- `it('no longer carries the old placeholder', …)`: the contents do not contain `hADITH_API_KEY`.

**`HadithConfigTest.php`** (`config('hadith')`; for the key tests re-evaluate the file with `require config_path('hadith.php')`).
- `it('pins the full 40 character commit and never @1', …)`: `commit` equals `df57907be35291c91ad6a6691180e22ca9920784`, matches `/^[0-9a-f]{40}$/`; the raw text of `config_path('hadith.php')` does not contain `@1`; `cdn_base` equals `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api`.
- `it('lists exactly the ten slugs in order', …)`: `collections` is identical (`toBe`) to the ten-slug list in the order above.
- `it('has grades hidden and a constant, not an env read', …)`: `grades_visible` is `false`; the file text does not match `/grades_visible.*env\(/`.
- `it('has no approved_collections', …)`: `config('hadith')` has no `approved_collections` key and the file text does not contain `approved_collections`.
- `it('names the source and keeps the shared lists empty', …)`: `source_code` and `primary_source` are `fawazahmed0`; `slug_map` and `reference_exceptions` are `[]`.
- `it('has the twelve file keys with null or sha256 values', …)`: `array_keys(config('hadith.files'))` is identical to the twelve keys in the order above; every value is `null` or matches `/^[0-9a-f]{64}$/`.
- `it('reads the flag as a boolean, default false', …)`: `config('hadith.import_enabled')` is a `bool`.
- Key tests, with `$_ENV`/`$_SERVER` set and restored in `afterEach` (copy the cleanup style of `tests/Unit/Support/EnvTest.php`, also restore `APP_ENV`):
  - `it('is null in production even when a key is set', …)`: `$_ENV['APP_ENV'] = 'production'` (and `$_SERVER`), `$_ENV['HADITH_API_KEY'] = 'FIXTURE-KEY'`; `(require config_path('hadith.php'))['api_key']` is `null`.
  - `it('returns the key outside production', …)`: `APP_ENV` `local`, key `FIXTURE-KEY`; value is `'FIXTURE-KEY'`.
  - `it('is null when the key is empty', …)`: `APP_ENV` `local`, `HADITH_API_KEY` `''`; value is `null`.

**`HadithTitlesConfigTest.php`** (`config('hadith_titles')`; the expected map below lives in the test as a literal `const`-style array, copied byte for byte from the plan table above).
- `it('has exactly the ten slugs in the order of config hadith.collections', …)`: `array_keys(config('hadith_titles.collections'))` is identical to `config('hadith.collections')`.
- `it('has a non-empty Arabic collection name from ummahapi.com on every entry', …)`: `title_ar` is a non-empty string matching `/^[\p{Arabic}\s]+$/u` (Arabic letters and spaces only, no digits or Latin letters, no leading or trailing space); `title_ar_source === 'ummahapi.com'`; each entry has exactly the five keys.
- `it('keeps every collection name byte equal to the plan', …)`: for each slug, `title_ar === $expected[$slug]['title_ar']` and `author_ar === $expected[$slug]['author_ar']` (`null` for `qudsi`), using `toBe`, plus `strlen` equality to catch hidden marks.
- `it('marks every author as drafted and approved, and qudsi has none', …)`: each author entry has `author_ar_source === 'developer'` and `author_ar_status === 'approved'`; `qudsi` has all three author keys `null`; no other entry has a null author.
- `it('has no section titles yet', …)`: `config('hadith_titles.sections')` is `[]`.
- `it('contains no Latin text', …)`: no `title_ar` or `author_ar` contains `[A-Za-z0-9]`.

**`HadithSourceMigrationTest.php`**. Follow `AzkarMigrationTest.php`: no `RefreshDatabase` (DDL commits on MySQL), `beforeEach` runs `$this->artisan('migrate')->assertSuccessful()`, and a helper `hadithMigration(string $name): object` that globs `database_path('migrations/*_'.$name.'.php')`, expects one match and `require`s it.
- `it('seeds fawazahmed0 as not_required with the Unlicense and the provenance note', …)`: after `down()` the row is gone; after `up()` twice there is exactly one row with `permission_status` `not_required`, `name` `fawazahmed0/hadith-api`, `licence_url` containing `df57907be35291c91ad6a6691180e22ca9920784` and ending in `/LICENSE`, `attribution_en` `Source: fawazahmed0/hadith-api (Unlicense)`, and `notes` containing `Unlicense` and `ADR 0042`. Restore the row at the end (`up()`).
- `it('seeds sunnahcom as pending with an empty Arabic attribution', …)`: same pattern; `permission_status` `pending`, `attribution_ar` is `''`, `attribution_en` `Sunnah.com`.
- `it('its down removes only its own row', …)`: run `down()` of the fawazahmed0 migration; the `sunnahcom` and `opendua` rows still exist; restore with `up()`.
- `it('the PermissionStatus enum treats not_required as deliverable and pending as not', …)`: `PermissionStatus::NotRequired->allowsDelivery()` is true, `PermissionStatus::Pending->allowsDelivery()` is false (guards the gate the pack builder will use in step 4).

**`SourcePermissionCommandTest.php`** (existing file; add at the end, same style, same `afterEach` reset):
- `it('sets the sunnahcom source locally', …)`: `$this->artisan('azkar:source-permission', ['status' => 'pending', '--source' => 'sunnahcom'])->assertExitCode(0)`; the `sunnahcom` row is `pending`.
- `it('refuses to change sunnahcom in production and leaves it unchanged', …)`: `app()->detectEnvironment(fn (): string => 'production')`; the command with `--source=sunnahcom` and status `granted` prints `Refused` and exits 1; reset the environment to `testing` before asserting that `sunnahcom` is still `pending`. (This is the plan's "production refuses to change a source status from the command line".)

This file uses `RefreshDatabase`, so the `content_sources` migrations run in its transaction setup as for the existing OpenDua tests.

## Reuse (paths checked)
- `apps/api/config/azkar.php` (config style, `(bool) env(…, false)` flag)
- `apps/api/database/migrations/2026_10_31_100009_insert_opendua_content_source.php`, `2026_11_01_100013_insert_hadeethenc_content_source.php` (insert pattern)
- `apps/api/app/Domains/Content/Enums/PermissionStatus.php`, `Models/ContentSource.php`
- `apps/api/app/Domains/Azkar/Console/SourcePermissionCommand.php` and `tests/Feature/Azkar/SourcePermissionCommandTest.php`
- `apps/api/tests/Feature/Content/AzkarMigrationTest.php` (migration test pattern), `tests/Unit/Support/EnvTest.php` (env cleanup)
- `apps/api/app/Domains/Azkar/Exceptions/CatalogueDownloadException.php` (exception style)

## Gates
Run from `apps/api` with the local PHP 8.5:

```bash
composer qa
```

(`pint --test`, `phpstan analyse` at level 8, `pest --parallel`.) If Pint reports style issues, run `vendor/bin/pint` once, then rerun `composer qa`. No dependency changes, so `composer audit` and `node .github/scripts/npm-audit.mjs` are not required. **No OpenAPI change is expected in this step** (no route, controller, resource or schema change): `npm run generate -w @quran/api-contract` must produce no diff in `openapi.json` or `schema.d.ts`. If it does, stop and report.

## Out of scope
- Any hadith table, model, factory or migration other than the two `content_sources` rows (step 3).
- `ResourceGroup`, `PackSchema`, the pack builder, the manifest, mobile files (step 4).
- The fawazahmed0 HTTP client, snapshot and the real SHA-256 values (step 5). Do not fetch anything from the network.
- `hadith:import`, `hadith:match-section-titles`, log redaction of the API key, the scheduler entry (step 6); endpoints (step 7).
- Any call to `HadithKillSwitch` from other code, `docker/release.sh`, `docs/runbooks/railway-release.md` (step 17).
- Section titles, English titles, any hadith text, grade text or fixture text. Editing `docs/technical-spec.md`, ADR 0042 or `docs/plans/phase-7.md`.
- Setting `HADITH_COLLECTIONS_IMPORT_ENABLED=true` anywhere. Touching `apps/api/.env`.

## Open questions for the developer

1. **Licence URL.** Resolved (orchestrator, 1 Nov 2026): the repository root lists a file named `LICENSE`, so `…/blob/<pinned commit>/LICENSE` is correct.
2. **Source-line and provenance wording** (`attribution_ar`, `attribution_en`, `notes`) are the plan's recommended defaults. Change them before commit if you prefer.
3. **Author status.** Resolved: approved. Open question 3's default ("approve the authors") was accepted by the developer on 1 Nov 2026, so `author_ar_status = 'approved'` stands.
4. **`primary_source`** is a constant `fawazahmed0` (no env), unlike `azkar.primary_source`. The switch to Sunnah.com is a code and config edit in step 18.
5. **Edition file names.** Resolved (orchestrator, 1 Nov 2026): `editions.json` lists `ara-{slug}` for all ten collections, `ara-nawawi`, `ara-qudsi` and `ara-dehlawi` included.

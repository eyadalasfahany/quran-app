# Step 2 — Import the pinned quran-svg pages and ayah polygons (ADR 0090)

Branch `ft/madinah-svg-mushaf`, worktree `/Applications/MAMP/htdocs/quran-app-mushaf`. Stage nothing; the developer commits. API only. No app code, no packs, no word boxes (those are steps 3 and 5).

## Read first

- `docs/adr/0090-madinah-svg-mushaf.md` (decisions 5–7, 9), `docs/adr/0068-source-cache-on-the-volume.md`.
- Spec `docs/technical-spec.md` §7, the «SVG mushafs (ADR 0090)» bullet under «Pack contents by group».
- Patterns to copy:
  - `config/hadith.php`: a pinned source;
  - `app/Support/Storage/SourceCache.php` and `app/Domains/Hadith/Sources/SnapshotStore.php`: the cache folder, safe paths and atomic writes;
  - `app/Domains/Hadith/Console/HadithSnapshotCommand.php`: download, verify, refuse;
  - `app/Domains/Duas/DuasServiceProvider.php`: provider and command registration;
  - `bootstrap/providers.php`.
- The `laravel-standards` skill. Follow the domain layout used by Duas and Hadith: `Console/`, `Models/`, `Repositories/Contracts` + `Eloquent`, `Services/`, `Sources/`, `Exceptions/`.
- The pinned manifest `resources/svg-mushaf/quran-svg-v1.1.1.json`. It already exists and must not be edited. Its shape:
  - `commit`;
  - `editions.{folder}.base`, for example `mushafs/hafs/kfqc`;
  - `editions.{folder}.pages`: 604 entries of `[svg_blob_sha, svg_bytes, json_blob_sha, json_bytes]`, where index 0 is page 1;
  - `editions.{folder}.surah` and `.markers`: `[blob_sha, bytes]`.

## Source facts

- Raw file URL: `{raw_base}/{commit}/{base}/svg/{NNN}.svg` and `{raw_base}/{commit}/{base}/json/{NNN}.json`, with `NNN` zero-padded to 3 digits. `surah.json` is at `{base}/json/surah.json`.
- A1 check: a file is accepted only if its size equals the manifest bytes **and** `sha1("blob " . strlen($bytes) . "\0" . $bytes)` equals the manifest blob SHA. Any mismatch throws and nothing is written to the database.
- Page JSON: a list of objects `{surahNumber, ayahNumber, x, y, polygon}`.
  - `polygon` is a string. Store it exactly as received.
  - An ayah that spans two pages appears on both.
- `surah.json`: a list of 114 objects with `number` and `ayahCount`, among other fields.

## Files

1. **`config/mushaf.php`.** Every value is a reviewed decision. Nothing is read from env.

   ```php
   return [
       'repository' => 'quran-ws/quran-svg',
       'tag' => 'v1.1.1',
       'commit' => '3ff27b46cecb0c0519d77531d9c868a579d1f623',
       'raw_base' => 'https://raw.githubusercontent.com/quran-ws/quran-svg',
       'manifest' => 'svg-mushaf/quran-svg-v1.1.1.json', // relative to resource_path()
       'pages' => 604,
       // App key => source folder, print year (Hijri), expected total ayahs (null = check against surah.json only).
       'editions' => [
           'hafs' => ['folder' => 'hafs', 'edition_year' => 1441, 'expected_ayahs' => 6236],
           'warsh' => ['folder' => 'warsh', 'edition_year' => 1442, 'expected_ayahs' => null],
           'qalun' => ['folder' => 'qalon', 'edition_year' => 1443, 'expected_ayahs' => null],
           'shubah' => ['folder' => 'shubah', 'edition_year' => 1443, 'expected_ayahs' => null],
           'duri' => ['folder' => 'douri', 'edition_year' => 1443, 'expected_ayahs' => null],
       ],
   ];
   ```

2. **Migrations.** Three tables with these exact names. The QF mirror already has `mushafs` and `mushaf_pages`.

   | Table | Columns | Keys |
   | --- | --- | --- |
   | `svg_mushafs` | `id`; `key` string(16); `folder` string(16); `edition_year` smallint unsigned; `source_commit` char(40); `page_count` smallint unsigned; `ayah_count` smallint unsigned; `imported_at` timestamp; timestamps | unique `key` |
   | `svg_mushaf_pages` | `id`; `svg_mushaf_id` FK cascade; `page` smallint unsigned; `svg_blob_sha` char(40); `svg_bytes` int unsigned; `gz_sha256` char(64); `gz_bytes` int unsigned; timestamps | unique (`svg_mushaf_id`, `page`) |
   | `svg_mushaf_ayah_regions` | `id`; `svg_mushaf_id` FK cascade; `page` smallint unsigned; `surah` tinyint unsigned; `ayah` smallint unsigned; `label_x` decimal(8,2); `label_y` decimal(8,2); `polygon` text | unique (`svg_mushaf_id`, `page`, `surah`, `ayah`); index (`svg_mushaf_id`, `surah`, `ayah`) |

3. **Models** `SvgMushaf`, `SvgMushafPage` and `SvgMushafAyahRegion` in `app/Domains/Mushaf/Models/`, with relations.

4. **`app/Domains/Mushaf/Sources/SvgMushafStore`.** The cache folder `SourceCache::path('svg-mushaf/{commit}')`, with the same safe-path and atomic-write rules as `SnapshotStore`.
   - Files are kept at their source-relative paths.
   - Each page also gets a `{base}/svg/{NNN}.svg.gz` beside it, written with `gzencode($bytes, 9)`.

5. **`app/Domains/Mushaf/Sources/SvgMushafDownloader`** (HTTP client).
   - For each needed file, use the cached copy if it exists and passes A1. Otherwise download it, run A1, then write it.
   - Throw `SvgMushafSourceException` on a size or SHA mismatch, a non-200 response, or a file missing from the manifest.
   - Keep the time and memory per file bounded: one file at a time, nothing held across pages.

6. **`app/Domains/Mushaf/Services/SvgMushafImporter`.** `import(string $key, bool $offline): ImportReport`.
   1. Resolve the edition from config. Throw on an unknown key.
   2. Through the downloader (cache only when `$offline`): the 604 page SVGs, the 604 page JSONs and `surah.json`.
   3. Parse every page JSON. Collect the distinct (surah, ayah) pairs across pages.
   4. **A2:**
      - For every surah 1–114, the number of distinct ayahs found equals that surah's `ayahCount` in `surah.json`.
      - The total equals the sum of the `ayahCount`s.
      - The total equals `expected_ayahs` when that is not null.
      - Any failure throws `SvgMushafCheckException`, listing the failing surahs by number with found and expected counts.
   5. Only after A1 and A2 pass, in one DB transaction:
      - upsert the `svg_mushafs` row (`ayah_count` = total, `imported_at` = now);
      - delete that edition's pages and regions, then insert them;
      - for pages, read `gz_sha256` and `gz_bytes` from the written `.svg.gz`.
   6. Return a report: pages, regions, ayahs, bytes of raw SVG and of gzip.

7. **`app/Domains/Mushaf/Console/ImportSvgMushafCommand`.**
   - Signature: `mushaf:import {key : hafs, warsh, qalun, shubah or duri} {--offline : use cached files only}`.
   - Prints the report.
   - Returns a non-zero exit with the exception's message on any failure.

8. **`app/Domains/Mushaf/MushafServiceProvider`.** Registers the command and the repository bindings. Add it to `bootstrap/providers.php`.

## Tests (Pest; no network: use `Http::fake`)

Override config so `pages` is 2. Fixture page JSON uses placeholder numbers and a placeholder polygon string `"M 0 0 L 1 0 L 1 1 L 0 1 Z"`. Fixture SVGs are tiny placeholder SVGs with no Quran artwork. Build a fixture manifest in a temporary `resource_path` override, with blob SHAs computed from the fixture bytes.

1. The blob SHA helper matches `git hash-object` for a known string: `"hello\n"` → `ce013625030ba8dba906f756967f9e9ca394464a`.
2. A fake response with one changed byte is refused. Nothing is written to the cache or the database.
3. A2 refuses a page set missing one ayah, and the message names the surah.
4. A good fixture imports: row counts, `ayah_count`, the `.svg.gz` exists, `gz_sha256` matches.
5. A re-import replaces the rows (counts unchanged, no duplicates).
6. `--offline` with an empty cache fails with a clear message.
7. An unknown key fails.

## Gates

- `composer qa` in `apps/api`: Pint, PHPStan, Pest.
- Do **not** run a real import, which downloads hundreds of MB. The coordinator runs it.
- Report back:
  - every file created or changed;
  - the `composer qa` output summary;
  - anything in this brief that conflicts with the code or the spec. Stop and report rather than guess.

<?php

declare(strict_types=1);

use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Hadith\Import\Records\HadithImportReport;
use App\Domains\Hadith\Import\Records\HadithIssue;
use App\Domains\Hadith\Import\Records\MappingResult;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Overlay\HadithOverlay;
use App\Domains\Hadith\Repositories\Contracts\HadithImportRepository;
use App\Domains\Hadith\Repositories\Eloquent\EloquentHadithImportRepository;
use App\Domains\Hadith\Services\HadithImporter;
use App\Domains\Hadith\Services\HadithMapper;
use App\Domains\Hadith\Sources\HadithSnapshotter;
use App\Domains\Hadith\Sources\Records\SourceCollection;
use App\Domains\Hadith\Sources\Records\SourceCollectionInfo;
use App\Domains\Hadith\Sources\Records\SourceGrade;
use App\Domains\Hadith\Sources\Records\SourceHadith;
use App\Domains\Hadith\Sources\Records\SourceSection;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/*
| Helpers for the step 6 importer tests. Placeholder text only: every text is FIXTURE or «نص تجريبي», never a hadith.
| Not a test file (its name does not end in Test.php); test files load it with require_once.
*/

/**
 * The default decoded edition: five hadith in four sections. Hadith 3 has no text; 2787.2 is a decimal number.
 *
 * @return array<string, mixed>
 */
function hadithImportCollection(): array
{
    return [
        'metadata' => [
            'name' => 'FIXTURE collection',
            'sections' => ['0' => '', '1' => 'FIXTURE section 1', '2' => 'FIXTURE section 2', '3' => 'FIXTURE section 3'],
            'section_details' => [
                '0' => ['hadithnumber_first' => 0, 'hadithnumber_last' => 0, 'arabicnumber_first' => 0, 'arabicnumber_last' => 0],
                '1' => ['hadithnumber_first' => 1, 'hadithnumber_last' => 2, 'arabicnumber_first' => 1, 'arabicnumber_last' => 2],
                '2' => ['hadithnumber_first' => 3, 'hadithnumber_last' => 4, 'arabicnumber_first' => 3, 'arabicnumber_last' => 4],
                '3' => ['hadithnumber_first' => 2787.2, 'hadithnumber_last' => 2787.2, 'arabicnumber_first' => 5, 'arabicnumber_last' => 5],
            ],
        ],
        'hadiths' => [
            [
                'hadithnumber' => 1,
                'arabicnumber' => 1,
                'text' => 'FIXTURE text 1 — not a hadith',
                'grades' => [['name' => 'FIXTURE grader', 'grade' => 'FIXTURE grade']],
                'reference' => ['book' => 1, 'hadith' => 1],
            ],
            [
                'hadithnumber' => 2,
                'arabicnumber' => 2,
                'text' => "نص تجريبي ١ —\u{200F} ليس حديثًا",
                'grades' => [
                    ['name' => 'FIXTURE grader', 'grade' => 'FIXTURE grade'],
                    ['name' => 'FIXTURE grader 2', 'grade' => 'FIXTURE grade 2'],
                ],
                'reference' => ['book' => 1, 'hadith' => 2],
            ],
            [
                'hadithnumber' => 3,
                'arabicnumber' => 3,
                'text' => '',
                'grades' => [],
                'reference' => ['book' => 2, 'hadith' => 3],
            ],
            [
                'hadithnumber' => 4,
                'arabicnumber' => 4,
                'text' => 'FIXTURE text 4 — not a hadith',
                'grades' => [],
                'reference' => ['book' => 2, 'hadith' => 4],
            ],
            [
                'hadithnumber' => 2787.2,
                'arabicnumber' => 5,
                'text' => 'FIXTURE text 5 — not a hadith',
                'grades' => [],
                'reference' => ['book' => 3, 'hadith' => 5],
            ],
        ],
    ];
}

/**
 * The twelve pinned files: the step 5 placeholders with every edition replaced by hadithImportCollection() (optionally
 * edited per path) and info.json rebuilt to match.
 *
 * @param  (callable(string, array<string, mixed>): array<string, mixed>)|null  $editOne
 * @return array<string, string>
 */
function hadithImportFiles(?callable $editOne = null): array
{
    $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR;
    $files = hadithFixtureFiles();
    $info = [];

    foreach (hadithFixtureSourceSlugs() as $sourceSlug) {
        $path = 'editions/ara-'.$sourceSlug.'.json';
        $data = hadithImportCollection();

        if ($editOne !== null) {
            $data = $editOne($path, $data);
        }

        $files[$path] = json_encode($data, $flags);

        $info[$sourceSlug] = [
            'metadata' => [
                'name' => 'FIXTURE collection',
                'last_hadithnumber' => 2787.2,
                'sections' => ['0' => '', '1' => 'FIXTURE section 1', '2' => 'FIXTURE section 2', '3' => 'FIXTURE section 3'],
            ],
            'hadiths' => array_map(
                static fn (array $hadith): array => [
                    'hadithnumber' => $hadith['hadithnumber'],
                    'arabicnumber' => $hadith['arabicnumber'],
                    'grades' => $hadith['grades'],
                    'reference' => $hadith['reference'],
                ],
                $data['hadiths'],
            ),
        ];
    }

    $files['info.json'] = json_encode($info, $flags);

    return $files;
}

/**
 * Serves the given files from a fresh temporary cache. Returns the cache root; the test deletes it.
 *
 * @param  array<string, string>  $files
 */
function hadithImportUse(array $files): string
{
    $root = hadithUseTempCache();
    hadithPinFixtures($files);
    hadithFakeCdn($files);

    return $root;
}

/**
 * Fills the temporary cache through the fake CDN, as hadith:import --download would.
 */
function hadithImportWarm(): void
{
    app(HadithSnapshotter::class)->take(false);
}

/**
 * @param  list<string>  $slugs
 */
function hadithImportRun(array $slugs = ['bukhari'], bool $dry = false, bool $build = false, bool $defer = true): HadithImportReport
{
    return app(HadithImporter::class)->run($slugs, $dry, $build, $defer);
}

/**
 * Replaces the repository with a decorator. Used to make a write fail or a stored text differ, inside the transaction.
 *
 * @param  callable(HadithImportRepository): HadithImportRepository  $wrap
 */
function hadithImportBindRepository(callable $wrap): void
{
    app()->bind(HadithImportRepository::class, fn (): HadithImportRepository => $wrap(new EloquentHadithImportRepository));
}

/**
 * A hand-built source collection (no file, no pin) for the mapper tests.
 *
 * @param  list<SourceHadith>  $hadiths
 * @param  list<SourceSection>|null  $sections
 */
function hadithImportRecord(array $hadiths, ?array $sections = null, string $slug = 'bukhari'): SourceCollection
{
    return new SourceCollection(
        slug: $slug,
        sourceSlug: $slug,
        editionName: 'ara-'.$slug,
        titleEn: 'FIXTURE collection',
        sections: $sections ?? hadithImportSections(),
        hadiths: $hadiths,
    );
}

/**
 * The four default sections: 0 (0–0), 1 (1–2), 2 (3–4), 3 (2787.2).
 *
 * @return list<SourceSection>
 */
function hadithImportSections(): array
{
    return [
        new SourceSection('0', null, '0', '0', '0', '0'),
        new SourceSection('1', 'FIXTURE section 1', '1', '2', '1', '2'),
        new SourceSection('2', 'FIXTURE section 2', '3', '4', '3', '4'),
        new SourceSection('3', 'FIXTURE section 3', '2787.2', '2787.2', '5', '5'),
    ];
}

/**
 * @param  list<SourceGrade>  $grades
 */
function hadithImportHadith(string $number, ?string $text, string $book = '1', array $grades = []): SourceHadith
{
    return new SourceHadith(
        number: $number,
        arabicNumber: $number,
        text: $text,
        grades: $grades,
        referenceBook: $book,
        referenceHadith: $number,
    );
}

/**
 * The packed tables of a hadith collection resource, built now. Each table's rows as the phone would read them.
 *
 * @return array{path: string, version: int, sizeBytes: int, rowCount: int, tables: array<string, list<array<string, mixed>>>}
 */
function hadithImportPack(int $resourceId): array
{
    $pack = app(PackBuilder::class)->build(Resource::query()->findOrFail($resourceId));
    $raw = gzdecode((string) Storage::disk('local')->get($pack->path));
    expect($raw)->toBeString();

    $file = storage_path('framework/testing/hadith-pack-'.bin2hex(random_bytes(4)).'.sqlite');
    File::ensureDirectoryExists(dirname($file));
    File::put($file, (string) $raw);
    $pdo = new PDO('sqlite:'.$file, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $tables = [];

    foreach (['hadith_collections', 'hadith_books', 'hadith_chapters', 'hadith_entries', 'hadith_grades', 'hadith_ref_aliases'] as $table) {
        $tables[$table] = $pdo->query('SELECT * FROM '.$table)->fetchAll(PDO::FETCH_ASSOC);
    }

    $pdo = null;
    File::delete($file);

    return [
        'path' => $pack->path,
        'version' => $pack->version,
        'sizeBytes' => $pack->sizeBytes,
        'rowCount' => $pack->rowCount,
        'tables' => $tables,
    ];
}

/**
 * Maps a hand-built collection with fixed attribution and the fixed clock.
 */
function hadithImportMap(SourceCollection $collection, ?SourceCollectionInfo $info = null, string $attributionAr = 'FIXTURE attribution ar', string $attributionEn = 'FIXTURE attribution en', string $sourceCode = 'fawazahmed0'): MappingResult
{
    return app(HadithMapper::class)->map(
        $collection,
        $info,
        1,
        $sourceCode,
        'FIXTURE-COMMIT',
        $attributionAr,
        $attributionEn,
        CarbonImmutable::parse('2026-11-07 10:00:00', 'UTC'),
    );
}

/**
 * @param  list<HadithIssue>  $issues
 * @return list<string>
 */
function hadithImportCodes(array $issues): array
{
    return array_map(fn (HadithIssue $issue): string => $issue->code, $issues);
}

/**
 * Approves the default fixture's no-text number 3 as a completeness exception for the given slugs (step 6b.1). Without it the
 * default collection is incomplete and held back.
 *
 * @param  list<string>  $slugs
 */
function hadithImportApproveFixtureGaps(array $slugs = ['bukhari']): void
{
    $exceptions = [];

    foreach ($slugs as $slug) {
        $exceptions[$slug] = ['3'];
    }

    config(['hadith.completeness_exceptions' => $exceptions]);
}

/**
 * Writes a pinned gaps file for one collection into a per-process temporary folder and serves it through HadithDataFiles
 * (step 6b.3). Returns the folder; the test deletes it. Placeholder text only.
 *
 * @param  list<array<string, mixed>>  $fills
 * @param  list<array<string, mixed>>  $merges
 * @param  list<array<string, mixed>>  $books
 * @param  list<array<string, mixed>>  $unresolved
 */
function hadithGapsFixtureFile(string $slug, array $fills = [], array $merges = [], array $books = [], array $unresolved = []): string
{
    $directory = storage_path('framework/testing/hadith-gaps-'.getmypid());
    File::ensureDirectoryExists($directory.'/gaps');

    $document = [
        'schema_version' => 1,
        'collection' => $slug,
        'generator' => 'hadith:build-gaps 1',
        'fawazahmed0_commit' => (string) config('hadith.commit'),
        'decisions_sha256' => str_repeat('0', 64),
        'origins' => [
            'openiti' => ['source_version' => '2023.1.8', 'doi' => 'FIXTURE doi', 'file' => 'FIXTURE file', 'file_sha256' => str_repeat('1', 64)],
            'hadithapicom' => ['source_version' => 'retrieved-2026-11-07', 'book_slug' => 'FIXTURE book'],
        ],
        'books' => $books,
        'fills' => $fills,
        'merges' => $merges,
        'unresolved' => $unresolved,
    ];

    $bytes = json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";
    File::put($directory.'/gaps/'.$slug.'.json', $bytes);
    config(['hadith.data_files' => ['gaps/'.$slug.'.json' => hash('sha256', $bytes)]]);
    app()->instance(HadithDataFiles::class, new HadithDataFiles($directory));

    return $directory;
}

/**
 * Maps a hand-built collection with an overlay (step 6b.3). The clock and attribution are the fixed ones of hadithImportMap().
 */
function hadithImportMapWithOverlay(SourceCollection $collection, ?HadithOverlay $overlay): MappingResult
{
    return app(HadithMapper::class)->map(
        $collection,
        null,
        1,
        'fawazahmed0',
        'FIXTURE-COMMIT',
        'FIXTURE attribution ar',
        'FIXTURE attribution en',
        CarbonImmutable::parse('2026-11-07 10:00:00', 'UTC'),
        $overlay,
    );
}

/**
 * Writes a pinned chapters file for one collection into the same per-process temporary folder as hadithGapsFixtureFile()
 * (step 6b.5) and merges its pin into config('hadith.data_files'), so a test can use both files. Placeholder titles only.
 *
 * @param  list<array<string, mixed>>  $chapters
 * @param  array<string, mixed>  $overrides  header keys replaced in the document (for example partial_books)
 */
function hadithChaptersFixtureFile(string $slug, array $chapters, array $overrides = []): string
{
    $directory = storage_path('framework/testing/hadith-gaps-'.getmypid());
    File::ensureDirectoryExists($directory.'/chapters');

    $document = array_merge([
        'schema_version' => 1,
        'collection' => $slug,
        'source' => 'openiti',
        'release' => '2023.1.8',
        'doi' => 'FIXTURE doi',
        'version_id' => 'FIXTURE version id',
        'source_file_sha256' => str_repeat('2', 64),
        'matcher_version' => '1',
        'partial_books' => 'drop',
        'licence' => 'FIXTURE licence',
        'chapters' => $chapters,
    ], $overrides);

    $bytes = json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";
    File::put($directory.'/chapters/'.$slug.'.json', $bytes);
    config(['hadith.data_files' => array_merge((array) config('hadith.data_files', []), ['chapters/'.$slug.'.json' => hash('sha256', $bytes)])]);
    app()->instance(HadithDataFiles::class, new HadithDataFiles($directory));

    return $directory;
}

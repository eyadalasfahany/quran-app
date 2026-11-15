<?php

declare(strict_types=1);

require_once __DIR__.'/../../Support/AzkarAudioTestManifest.php';

use App\Domains\Azkar\Data\ImportPlan;
use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Data\ImportStats;
use App\Domains\Azkar\Enums\AzkarEntryClass;
use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Azkar\Services\AzkarImportFingerprint;
use App\Domains\Azkar\Services\AzkarTransformer;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\AzkarEntry;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Content\Packs\PackSchema;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/*
| Plan docs/plans/azkar-duas-split.md, step 3. `entry_class` and `home` at import, in the report and in the pack; the
| fingerprint moves only when they change. Placeholder fixture only (ADR 0031 §9): the fixture has no dhikr or dua text
| that is read here. Entry keys come from tests/Fixtures/azkar/opendua-fixture.json.
*/

uses(RefreshDatabase::class);

const HOME_DUA = 'hisn-al-muslim:entry-000004';

const HOME_SESSION_DUA = 'hisn-al-muslim:entry-000001';

const HOME_SESSION_DUA_TWO = 'hisn-al-muslim:entry-000003';

const HOME_CANDIDATE = 'hisn-al-muslim:entry-000002';

beforeEach(function (): void {
    Bus::fake();
    Storage::fake('local');
    Storage::fake('azkar_audio');
    config([
        'azkar.hisnmuslim.snapshot_date' => '1900-01-01',
        'azkar.hadeethenc.snapshot_date' => '1900-01-01',
        'azkar.opendua.catalogue_sha256' => hash_file('sha256', homeFixture()),
        'azkar.quran_references' => [
            'hisn-al-muslim:entry-000004:evening:1' => [[1, 1, 7, 'status' => 'reviewed', 'evidence' => 'fixture'], [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture']],
        ],
        'azkar.audio_version' => '0.0.2',
        'azkar_entry_types.entries' => [],
        // ADR 0092: the reviewed topic rows are off here; the browse expectations are the catalogue tags.
        'azkar_topics.chapters' => [],
    ]);
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'granted']);
    azkarAudioTestManifest(['OD-901.mp3' => 'FIXTURE audio bytes']);
    Storage::disk('azkar_audio')->put('0.0.2/OD-901.mp3', 'FIXTURE audio bytes');
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/azkar-home'));
    File::deleteDirectory(azkarAudioTestDir());
});

function homeFixture(): string
{
    return base_path('tests/Fixtures/azkar/opendua-fixture.json');
}

function homeImport(bool $deferPack = false): ImportReport
{
    return app(AzkarImporter::class)->run(homeFixture(), false, false, false, null, null, $deferPack);
}

function homeResource(): Resource
{
    return Resource::query()->where('group', ResourceGroup::Azkar->value)->firstOrFail();
}

function homeEntry(string $entryKey): AzkarEntry
{
    return AzkarEntry::query()->where('resource_id', homeResource()->id)->where('entry_key', $entryKey)->firstOrFail();
}

/**
 * @param  array<string, array{type: string, status: string, evidence: string}>  $entries
 */
function homeUseTypes(array $entries): void
{
    config(['azkar_entry_types.entries' => $entries]);
}

/**
 * @return array{type: string, status: string, evidence: string}
 */
function homeRow(string $type, string $status = 'reviewed'): array
{
    return ['type' => $type, 'status' => $status, 'evidence' => 'fixture'];
}

/**
 * @param  array<string, mixed>  $entry
 */
function homePlan(array $entry): ImportPlan
{
    return new ImportPlan(
        chapters: [],
        entries: [$entry],
        items: [],
        segments: [],
        categories: [],
        entryCategories: [],
        notes: [],
        recordings: [],
        stats: new ImportStats,
    );
}

/**
 * The rows of one azkar table for the resource, sorted so two imports can be compared.
 *
 * @return array<int, array<string, mixed>>
 */
function homeTableRows(string $table, int $resourceId): array
{
    return DB::table($table)->where('resource_id', $resourceId)->get()
        ->map(fn (object $row): array => (array) $row)
        ->sortBy(fn (array $row): string => json_encode($row, JSON_THROW_ON_ERROR))
        ->values()
        ->all();
}

it('with no reviewed rows, entry_class and home are null on every entry', function (): void {
    homeUseTypes([]);

    $report = homeImport();

    $entries = AzkarEntry::query()->where('resource_id', homeResource()->id)->get();

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($entries)->not->toBeEmpty()
        ->and($entries->whereNotNull('entry_class')->count())->toBe(0)
        ->and($entries->whereNotNull('home')->count())->toBe(0);
});

it('leaves the fingerprint of an entry with null types equal to the fingerprint of the same entry without the two columns', function (): void {
    $fingerprints = app(AzkarImportFingerprint::class);
    $sha = str_repeat('a', 64);
    $entryWithoutColumns = ['id' => 1, 'entry_key' => 'fixture:entry-1', 'chapter_id' => 1, 'position' => 1, 'imported_at' => 123];
    $entryWithNullColumns = [...$entryWithoutColumns, 'entry_class' => null, 'home' => null];
    $entryWithDua = [...$entryWithoutColumns, 'entry_class' => 'dua', 'home' => 'duas'];

    expect($fingerprints->of($sha, homePlan($entryWithNullColumns)))->toBe($fingerprints->of($sha, homePlan($entryWithoutColumns)))
        ->and($fingerprints->of($sha, homePlan($entryWithDua)))->not->toBe($fingerprints->of($sha, homePlan($entryWithoutColumns)));
});

it('an empty config stores the same fingerprint as before the feature, and adding then removing types restores it', function (): void {
    homeUseTypes([]);
    homeImport();
    $emptyFingerprint = homeResource()->import_fingerprint;

    homeUseTypes([HOME_DUA => homeRow('dua')]);
    homeImport();
    expect(homeResource()->import_fingerprint)->not->toBe($emptyFingerprint);

    homeUseTypes([]);
    homeImport();

    expect(homeResource()->import_fingerprint)->toBe($emptyFingerprint);
});

it('a reviewed dua outside a session category gets home duas', function (): void {
    config(['azkar.session_categories' => []]);
    homeUseTypes([HOME_DUA => homeRow('dua')]);

    homeImport();

    expect(homeEntry(HOME_DUA)->entry_class)->toBe(AzkarEntryClass::Dua)
        ->and(homeEntry(HOME_DUA)->home)->toBe(AzkarTransformer::HOME_DUAS);
});

it('a reviewed dua whose entry is linked to a session category keeps home null', function (string $entryKey): void {
    homeUseTypes([$entryKey => homeRow('dua')]);

    homeImport();

    expect(homeEntry($entryKey)->entry_class)->toBe(AzkarEntryClass::Dua)
        ->and(homeEntry($entryKey)->home)->toBeNull();
})->with([
    'an entry in the after-waking session that also has a browse topic' => [HOME_SESSION_DUA],
    'an entry in the morning and evening sessions' => [HOME_SESSION_DUA_TWO],
]);

it('a reviewed dhikr keeps home null and records its class', function (): void {
    homeUseTypes([HOME_DUA => homeRow('dhikr')]);

    homeImport();

    expect(homeEntry(HOME_DUA)->entry_class)->toBe(AzkarEntryClass::Dhikr)
        ->and(homeEntry(HOME_DUA)->home)->toBeNull();
});

it('a candidate keeps both columns null, even as a dua outside sessions', function (): void {
    config(['azkar.session_categories' => []]);
    homeUseTypes([HOME_CANDIDATE => homeRow('dua', 'candidate'), HOME_DUA => homeRow('dua', 'candidate')]);

    homeImport();

    expect(homeEntry(HOME_CANDIDATE)->entry_class)->toBeNull()
        ->and(homeEntry(HOME_CANDIDATE)->home)->toBeNull()
        ->and(homeEntry(HOME_DUA)->entry_class)->toBeNull()
        ->and(homeEntry(HOME_DUA)->home)->toBeNull();
});

it('items, segments, notes, recordings and entry categories are identical with and without types', function (): void {
    homeUseTypes([]);
    homeImport();
    $resourceId = homeResource()->id;
    $tables = ['azkar_items', 'azkar_segments', 'azkar_notes', 'azkar_recordings', 'azkar_entry_categories'];
    $without = array_combine($tables, array_map(fn (string $table): array => homeTableRows($table, $resourceId), $tables));

    homeUseTypes([HOME_DUA => homeRow('dua'), HOME_SESSION_DUA => homeRow('dhikr'), HOME_CANDIDATE => homeRow('dua', 'candidate')]);
    homeImport();
    $with = array_combine($tables, array_map(fn (string $table): array => homeTableRows($table, $resourceId), $tables));

    expect($without['azkar_items'])->not->toBeEmpty()
        ->and($without['azkar_segments'])->not->toBeEmpty()
        ->and($without['azkar_recordings'])->not->toBeEmpty()
        ->and($without['azkar_entry_categories'])->not->toBeEmpty()
        ->and($with)->toBe($without)
        ->and(homeEntry(HOME_DUA)->home)->toBeNull();
});

it('the built azkar pack has the home column, carries it, and the pack schema version is unchanged', function (): void {
    config(['azkar.session_categories' => []]);
    homeUseTypes([HOME_DUA => homeRow('dua'), HOME_SESSION_DUA => homeRow('dhikr')]);
    homeImport();

    $pack = app(PackBuilder::class)->build(homeResource());
    $raw = gzdecode((string) Storage::disk('local')->get($pack->path));
    expect($raw)->toBeString();

    $path = tempnam(sys_get_temp_dir(), 'azkar-home-');
    expect($path)->toBeString();

    try {
        file_put_contents($path, (string) $raw);
        $pdo = new PDO('sqlite:'.$path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $columns = array_column($pdo->query('PRAGMA table_info(azkar_entries)')->fetchAll(PDO::FETCH_ASSOC), 'name');
        $homes = $pdo->query('SELECT entry_key, home FROM azkar_entries')->fetchAll(PDO::FETCH_KEY_PAIR);
        unset($pdo);
    } finally {
        if (is_file($path)) {
            unlink($path);
        }
    }

    expect(PackSchema::VERSION)->toBe(1)
        ->and($columns)->toContain('home')
        ->and($columns)->not->toContain('entry_class')
        ->and($homes[HOME_DUA])->toBe(AzkarTransformer::HOME_DUAS)
        ->and($homes[HOME_SESSION_DUA])->toBeNull();
});

it('a re-import with the same config reports unchanged: no version bump and no pack work', function (): void {
    homeUseTypes([HOME_DUA => homeRow('dua')]);
    homeImport();
    $before = homeResource();
    Bus::fake();

    $report = homeImport();

    expect($report->status)->toBe(ImportReport::STATUS_UNCHANGED)
        ->and(homeResource()->version)->toBe($before->version)
        ->and(homeResource()->import_fingerprint)->toBe($before->import_fingerprint);
});

it('the report counts reviewed duas, moved duas per browse category, candidates and duas kept in sessions', function (): void {
    // The tag itself, not its split topics (the split is covered in AzkarImportTest).
    config(['azkar.session_categories' => [], 'azkar.split_topics' => []]);
    homeUseTypes([
        HOME_SESSION_DUA => homeRow('dua'),
        HOME_SESSION_DUA_TWO => homeRow('dua'),
        HOME_DUA => homeRow('dhikr'),
        HOME_CANDIDATE => homeRow('dua', 'candidate'),
    ]);

    $report = homeImport();

    expect($report->content['entry_types'])->toBe([
        'reviewed_dua' => 2,
        'reviewed_dhikr' => 1,
        'moved_to_duas' => 2,
        'moved_to_duas_by_category' => ['morning-and-evening' => 2],
        'duas_kept_in_sessions' => 0,
        'candidates_not_applied' => 1,
    ]);
});

it('the report counts a reviewed dua kept whole in its session, and nothing moved', function (): void {
    homeUseTypes([HOME_SESSION_DUA => homeRow('dua')]);

    $report = homeImport();

    expect($report->content['entry_types'])->toMatchArray([
        'reviewed_dua' => 1,
        'moved_to_duas' => 0,
        'moved_to_duas_by_category' => [],
        'duas_kept_in_sessions' => 1,
    ]);
});

it('the command prints the entry type counts', function (): void {
    config(['azkar.session_categories' => []]);
    homeUseTypes([HOME_DUA => homeRow('dua')]);

    $this->artisan('azkar:import', [
        'path' => homeFixture(),
        '--report' => storage_path('framework/testing/azkar-home/report.json'),
    ])
        ->expectsOutputToContain('moved to Duas (home=duas)')
        ->assertExitCode(0);
});

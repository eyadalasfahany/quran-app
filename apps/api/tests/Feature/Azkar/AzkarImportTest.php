<?php

declare(strict_types=1);

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Jobs\BuildContentPackJob;
use App\Domains\Content\Models\AzkarCategory;
use App\Domains\Content\Models\AzkarChapter;
use App\Domains\Content\Models\AzkarEntry;
use App\Domains\Content\Models\AzkarEntryCategory;
use App\Domains\Content\Models\AzkarItem;
use App\Domains\Content\Models\AzkarNote;
use App\Domains\Content\Models\AzkarRecording;
use App\Domains\Content\Models\AzkarSegment;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Support\QuranText\SearchTextNormalizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

/*
| Placeholder fixture only (ADR 0031 §9). Every text is «نص تجريبي» or FIXTURE, never a dhikr.
*/

const AZKAR_QURAN_SPAN = "\u{FD3F}نص تجريبي\u{FD3E}";

beforeEach(function (): void {
    Bus::fake();
    azkarPinTo(azkarFixturePath());
    azkarUseFixtureReferences();
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/azkar'));
});

function azkarFixturePath(): string
{
    return base_path('tests/Fixtures/azkar/opendua-fixture.json');
}

/**
 * @return array<string, mixed>
 */
function azkarFixture(): array
{
    /** @var array<string, mixed> $catalogue */
    $catalogue = json_decode((string) file_get_contents(azkarFixturePath()), true, 512, JSON_THROW_ON_ERROR);

    return $catalogue;
}

/**
 * @param  array<string, mixed>  $catalogue
 */
function azkarWriteCatalogue(array $catalogue): string
{
    return azkarWriteBytes(json_encode($catalogue, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
}

function azkarWriteBytes(string $bytes): string
{
    $path = storage_path('framework/testing/azkar/'.bin2hex(random_bytes(6)).'.json');
    File::ensureDirectoryExists(dirname($path));
    File::put($path, $bytes);

    return $path;
}

function azkarPinTo(string $path): void
{
    config(['azkar.opendua.catalogue_sha256' => hash_file('sha256', $path)]);
}

function azkarUseFixtureReferences(): void
{
    config(['azkar.quran_references' => [
        'hisn-al-muslim:entry-000004:evening:1' => [[1, 1, 7, 'status' => 'reviewed', 'evidence' => 'fixture'], [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture']],
    ]]);
}

function azkarEnableWetImport(): void
{
    config(['azkar.opendua.import_enabled' => true]);
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'granted']);
}

function azkarDryRun(string $path): ImportReport
{
    return app(AzkarImporter::class)->run($path, true);
}

function azkarWetRun(string $path): ImportReport
{
    return app(AzkarImporter::class)->run($path, false);
}

/**
 * @return list<string>
 */
function azkarErrorCodes(ImportReport $report): array
{
    return array_values(array_map(fn (array $issue): string => $issue['code'], $report->errors()));
}

it('validates and transforms the fixture in a dry run and writes no rows', function (): void {
    $report = azkarDryRun(azkarFixturePath());

    expect($report->status)->toBe(ImportReport::STATUS_VALID)
        ->and($report->content['entries_imported'])->toBe(4)
        ->and($report->content['chapters_imported'])->toBe(3)
        ->and($report->content['items'])->toBe(['recitation' => 4, 'instruction' => 2, 'narration' => 1])
        ->and($report->content['segments'])->toBe(['text' => 7, 'quran' => 2])
        ->and($report->content['quran_passages'])->toBe(['mapped' => 2, 'unmapped' => 0])
        ->and($report->sourced['items_with_required_count'])->toBe(1)
        ->and($report->sourced['items_without_required_count'])->toBe(6)
        ->and($report->gated['english'])->toBe(['available' => 7, 'stored' => 0, 'skipped' => 7, 'store_english' => false])
        ->and($report->gated['recordings']['upstream'])->toBe(1)
        ->and($report->gated['recordings']['imported'])->toBe(0)
        ->and($report->gated['recordings']['legally_downloadable'])->toBe(0)
        ->and($report->changedUpstreamTexts['count'])->toBe(0)
        ->and($report->errors())->toBe([])
        ->and(AzkarItem::query()->count())->toBe(0)
        ->and(Resource::query()->count())->toBe(0);
});

it('reports the warnings the brief lists, with counts only', function (): void {
    config(['azkar.chapter_titles_ar' => []]);

    $report = azkarDryRun(azkarFixturePath());
    $codes = array_count_values(array_map(fn (array $issue): string => $issue['code'], $report->warnings()));

    expect($codes)->toEqualCanonicalizing([
        'chapter_without_arabic_title' => 3,
        'english_only_step' => 1,
        'dua_placeholders' => 1,
    ]);
});

it('blocks only the entry whose Quran passages have no reviewed reference row', function (): void {
    config(['azkar.quran_references' => []]);

    $report = azkarDryRun(azkarFixturePath());

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(azkarErrorCodes($report))->toBe(['quran_reference_unreviewed'])
        ->and($report->errors()[0]['entry'])->toBe('hisn-al-muslim:entry-000004')
        ->and($report->content['entries_imported'])->toBe(3)
        ->and($report->content['entries_blocked'])->toBe(1)
        ->and($report->content['quran_passages'])->toBe(['mapped' => 0, 'unmapped' => 2]);
});

it('stores English only when enabled, and never for an item with a Quran segment', function (): void {
    config(['azkar.opendua.store_english' => true]);

    $report = azkarDryRun(azkarFixturePath());

    expect($report->gated['english'])->toBe(['available' => 7, 'stored' => 6, 'skipped' => 1, 'store_english' => true]);
});

it('counts recordings as upstream and imports them only with verified rights', function (): void {
    config([
        'azkar.opendua.audio_rights_verified' => true,
        'azkar.recording_rights' => [
            'stream_allowed' => true,
            'download_allowed' => true,
            'redistribution_allowed' => false,
            'attribution_ar' => null,
            'attribution_en' => 'FIXTURE attribution',
            'licence' => 'FIXTURE licence',
            'licence_url' => 'https://example.invalid/fixture-licence',
            'rights_verified_at' => '2026-10-01T00:00:00Z',
        ],
    ]);

    $report = azkarDryRun(azkarFixturePath());

    expect($report->gated['recordings'])->toBe([
        'upstream' => 1,
        'upstream_objects' => 1,
        'imported' => 1,
        'legally_downloadable' => 1,
        'audio_rights_verified' => true,
    ]);
});

it('refuses a dry run file whose SHA-256 differs from the pin, and lists the mismatch', function (): void {
    config(['azkar.opendua.catalogue_sha256' => str_repeat('0', 64)]);

    $report = azkarDryRun(azkarFixturePath());

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(azkarErrorCodes($report))->toContain('checksum_mismatch');
});

it('reports invalid JSON and invalid UTF-8 as file errors', function (string $bytes, string $code): void {
    $path = azkarWriteBytes($bytes);
    azkarPinTo($path);

    $report = azkarDryRun($path);

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(azkarErrorCodes($report))->toBe([$code]);
})->with([
    'invalid json' => ['{"entries": [', 'invalid_json'],
    'invalid utf-8' => ["{\"entries\": \"\xFF\"}", 'invalid_utf8'],
]);

it('reports an unreadable file and writes nothing', function (): void {
    $report = azkarDryRun(storage_path('framework/testing/azkar/missing.json'));

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(azkarErrorCodes($report))->toBe(['unreadable_file']);
});

/**
 * One small malformed copy per validation error (ADR 0031 §3). Each mutation must produce its code.
 *
 * @return array<string, array{0: Closure, 1: string}>
 */
function azkarMalformedCases(): array
{
    return [
        'unknown step type' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['entries'][1]['steps'][0]['type'] = 'dance';
        }), 'unknown_step_type'],
        'recitation item without Arabic' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['entries'][1]['steps'][1]['items'][0]['dua']['arabic'] = '';
        }), 'recitation_without_arabic'],
        'times of zero' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['entries'][1]['steps'][1]['items'][0]['times'] = 0;
        }), 'invalid_times'],
        'times as a string' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['entries'][1]['steps'][1]['items'][0]['times'] = '3';
        }), 'invalid_times'],
        'unbalanced Quran marks' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['entries'][0]['variations'][0]['steps'][0]['items'][0]['dua']['arabic'] = "\u{FD3F}نص تجريبي بلا إغلاق";
        }), 'unbalanced_quran_marks'],
        'HTML tag in text' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['entries'][0]['title'] = '<b>FIXTURE</b>';
        }), 'html_in_text'],
        'bidi control character' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['entries'][0]['sourceReference'] = "FIXTURE\u{200F} reference";
        }), 'control_character'],
        'duplicate entry id' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['entries'][1]['id'] = $c['entries'][0]['id'];
        }), 'duplicate_entry_id'],
        'missing entry id' => [fn (array $c): array => tap($c, function (array &$c): void {
            unset($c['entries'][2]['id']);
        }), 'missing_entry_id'],
        'unknown chapter' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['entries'][1]['chapterId'] = 'chapter-999999';
        }), 'unknown_chapter'],
        'unknown tag' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['entries'][0]['tags'] = ['no-such-tag'];
        }), 'unknown_tag'],
        'recording without url' => [fn (array $c): array => tap($c, function (array &$c): void {
            unset($c['entries'][0]['variations'][0]['steps'][0]['recordings'][0]['url']);
        }), 'recording_incomplete'],
        'recording with unknown reciter' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['entries'][0]['variations'][0]['steps'][0]['recordings'][0]['reciterId'] = 'reciter-9999';
        }), 'unknown_reciter'],
        'counts disagree with the file' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['counts']['entries'] = 9;
        }), 'count_mismatch'],
        'data version other than the pin' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['dataVersion'] = '0.0.3';
        }), 'version_mismatch'],
        'chapter number repeated' => [fn (array $c): array => tap($c, function (array &$c): void {
            $c['chapters'][1]['number'] = 1;
        }), 'duplicate_chapter'],
    ];
}

it('fails the import with the validation error code and nothing else changes', function (string $case): void {
    $mutated = azkarMalformedCases()[$case][0](azkarFixture());
    $path = azkarWriteCatalogue($mutated);
    azkarPinTo($path);

    $report = azkarDryRun($path);

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(azkarErrorCodes($report))->toContain(azkarMalformedCases()[$case][1]);
})->with(array_map(fn (string $case): string => $case, array_keys(azkarMalformedCases())));

it('reports a Quran reference map with the wrong length or shape', function (array $map, string $code): void {
    config(['azkar.quran_references' => ['hisn-al-muslim:entry-000004:evening:1' => $map]]);

    $report = azkarDryRun(azkarFixturePath());

    expect(azkarErrorCodes($report))->toBe([$code]);
})->with([
    'one row for two spans' => [[[1, 1, 7, 'status' => 'reviewed', 'evidence' => 'fixture']], 'quran_reference_unreviewed'],
    'a zero surah' => [[[0, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture'], [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture']], 'invalid_quran_reference'],
    'a row without status' => [[[1, 1, 7], [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture']], 'invalid_quran_reference'],
    'an unknown status' => [[[1, 1, 7, 'status' => 'approved', 'evidence' => 'fixture'], [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture']], 'invalid_quran_reference'],
]);

it('collects every problem in one run instead of stopping at the first', function (): void {
    $catalogue = azkarFixture();
    $catalogue['entries'][1]['steps'][0]['type'] = 'dance';
    $catalogue['entries'][0]['title'] = '<i>FIXTURE</i>';
    $catalogue['counts']['duas'] = 99;
    $path = azkarWriteCatalogue($catalogue);
    azkarPinTo($path);

    $codes = azkarErrorCodes(azkarDryRun($path));

    expect($codes)->toContain('unknown_step_type', 'html_in_text', 'count_mismatch');
});

it('blocks only the entry with the error, and the other entries still import', function (): void {
    $catalogue = azkarFixture();
    $catalogue['entries'][1]['steps'][0]['type'] = 'dance';
    $path = azkarWriteCatalogue($catalogue);
    azkarPinTo($path);

    $report = azkarDryRun($path);

    expect($report->content['entries_imported'])->toBe(3)
        ->and($report->content['entries_blocked'])->toBe(1);
});

it('refuses a wet import while the import flag is off and writes nothing', function (): void {
    config(['azkar.opendua.import_enabled' => false]);
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'granted']);

    $report = azkarWetRun(azkarFixturePath());

    expect($report->status)->toBe(ImportReport::STATUS_LOCKED)
        ->and(implode(' ', $report->lockReasons))->toContain('AZKAR_OPENDUA_IMPORT_ENABLED')
        ->and(AzkarItem::query()->count())->toBe(0)
        ->and(Resource::query()->count())->toBe(0);

    Bus::assertNotDispatched(BuildContentPackJob::class);
});

it('refuses a wet import while the OpenDua source is pending, even with the flag on', function (): void {
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'pending']);
    config(['azkar.opendua.import_enabled' => true]);

    $report = azkarWetRun(azkarFixturePath());

    expect($report->status)->toBe(ImportReport::STATUS_LOCKED)
        ->and(implode(' ', $report->lockReasons))->toContain('permission_status is [pending]')
        ->and(AzkarItem::query()->count())->toBe(0);
});

it('refuses a wet import when recording rights are enabled without a licence', function (): void {
    azkarEnableWetImport();
    config(['azkar.opendua.audio_rights_verified' => true]);

    $report = azkarWetRun(azkarFixturePath());

    expect($report->status)->toBe(ImportReport::STATUS_LOCKED)
        ->and(implode(' ', $report->lockReasons))->toContain('Recording rights are incomplete');
});

it('the command prints the lock reasons and exits non-zero without writing a report', function (): void {
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'pending']);

    $reportPath = storage_path('framework/testing/azkar/locked-report.json');

    $this->artisan('azkar:import', ['path' => azkarFixturePath(), '--report' => $reportPath])
        ->expectsOutputToContain('The wet import is locked')
        ->assertExitCode(1);

    expect(File::exists($reportPath))->toBeFalse();
});

it('the dry run command exits zero and writes a report with counts, keys and no Arabic text', function (): void {
    $reportPath = storage_path('framework/testing/azkar/dry-run-report.json');

    $this->artisan('azkar:import', ['path' => azkarFixturePath(), '--dry-run' => true, '--report' => $reportPath])
        ->assertExitCode(0);

    $json = (string) file_get_contents($reportPath);
    $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

    expect($decoded['status'])->toBe('valid')
        ->and($decoded['mode'])->toBe('dry-run')
        ->and($decoded['content']['entries_imported'])->toBe(4)
        ->and(preg_match('/\p{Arabic}/u', $json))->toBe(0);
});

it('the dry run command exits non-zero when validation fails, and still writes the report', function (): void {
    config(['azkar.quran_references' => []]);
    $reportPath = storage_path('framework/testing/azkar/failed-report.json');

    $this->artisan('azkar:import', ['path' => azkarFixturePath(), '--dry-run' => true, '--report' => $reportPath])
        ->assertExitCode(1);

    $decoded = json_decode((string) file_get_contents($reportPath), true, 512, JSON_THROW_ON_ERROR);

    $errors = array_values(array_filter($decoded['issues'], fn (array $issue): bool => $issue['severity'] === 'error'));

    expect($decoded['status'])->toBe('invalid')
        ->and($errors[0]['code'])->toBe('quran_reference_unreviewed')
        ->and($errors[0]['entry'])->toBe('hisn-al-muslim:entry-000004');
});

it('replaces the azkar rows in one transaction, bumps the version and queues the pack', function (): void {
    azkarEnableWetImport();

    $report = azkarWetRun(azkarFixturePath());
    $resource = Resource::query()->where('group', ResourceGroup::Azkar->value)->firstOrFail();

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($resource->source_key)->toBe('hisn-al-muslim')
        ->and($resource->version)->toBe(1)
        ->and($resource->changes_floor_version)->toBe(1)
        ->and($resource->checksum)->toBe(hash_file('sha256', azkarFixturePath()))
        ->and(AzkarChapter::query()->count())->toBe(3)
        ->and(AzkarEntry::query()->count())->toBe(4)
        ->and(AzkarItem::query()->count())->toBe(7)
        ->and(AzkarSegment::query()->count())->toBe(9)
        ->and(AzkarCategory::query()->count())->toBe(7)
        ->and(AzkarEntryCategory::query()->count())->toBe(8)
        ->and(AzkarRecording::query()->count())->toBe(0)
        ->and(AzkarNote::query()->count())->toBe(0);

    Bus::assertDispatched(BuildContentPackJob::class, fn (BuildContentPackJob $job): bool => $job->resourceId === $resource->id);
});

it('defers the pack: the importer writes rows and returns a deferred pack without building or queuing it', function (): void {
    azkarEnableWetImport();

    $report = app(AzkarImporter::class)->run(azkarFixturePath(), false, deferPack: true);

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($report->resource['version_after'])->toBe(1)
        ->and($report->resource['pack'])->toBe(['built' => false, 'queued' => false, 'deferred' => true])
        ->and(AzkarItem::query()->count())->toBe(7);

    Bus::assertNotDispatched(BuildContentPackJob::class);
});

it('refuses to combine build-packs and defer-pack in the importer', function (): void {
    azkarEnableWetImport();

    expect(fn () => app(AzkarImporter::class)->run(azkarFixturePath(), false, buildPacks: true, deferPack: true))
        ->toThrow(LogicException::class, 'Choose --build-packs or --defer-pack, not both.')
        ->and(AzkarItem::query()->count())->toBe(0);
});

it('the command with defer-pack writes the rows, builds and queues no pack, and exits zero', function (): void {
    azkarEnableWetImport();
    Storage::fake('local');
    $reportPath = storage_path('framework/testing/azkar/deferred-report.json');

    $this->artisan('azkar:import', ['path' => azkarFixturePath(), '--defer-pack' => true, '--report' => $reportPath])
        ->assertExitCode(0);

    $resource = Resource::query()->where('group', ResourceGroup::Azkar->value)->firstOrFail();

    expect($resource->version)->toBe(1)
        ->and(AzkarItem::query()->count())->toBe(7)
        ->and(ContentPack::query()->where('resource_id', $resource->id)->count())->toBe(0)
        ->and(Storage::disk('local')->allFiles())->toBe([]);

    Bus::assertNotDispatched(BuildContentPackJob::class);
});

it('the command refuses build-packs together with defer-pack and writes nothing', function (): void {
    azkarEnableWetImport();
    $reportPath = storage_path('framework/testing/azkar/both-flags-report.json');

    $this->artisan('azkar:import', ['path' => azkarFixturePath(), '--build-packs' => true, '--defer-pack' => true, '--report' => $reportPath])
        ->expectsOutputToContain('Choose --build-packs or --defer-pack, not both.')
        ->assertExitCode(1);

    expect(AzkarItem::query()->count())->toBe(0)
        ->and(Resource::query()->count())->toBe(0);

    Bus::assertNotDispatched(BuildContentPackJob::class);
});

it('a wet import with errors writes no rows and does not create or bump the resource', function (): void {
    azkarEnableWetImport();
    $catalogue = azkarFixture();
    $catalogue['entries'][1]['steps'][0]['type'] = 'dance';
    $path = azkarWriteCatalogue($catalogue);
    azkarPinTo($path);

    $report = azkarWetRun($path);

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(AzkarItem::query()->count())->toBe(0)
        ->and(Resource::query()->count())->toBe(0);

    Bus::assertNotDispatched(BuildContentPackJob::class);
});

it('writes repeat group columns, required counts and no-trim Arabic exactly as received', function (): void {
    azkarEnableWetImport();
    azkarWetRun(azkarFixturePath());

    $repeated = AzkarItem::query()->where('item_key', 'like', 'hisn-al-muslim:entry-000003:morning:%')->orderBy('position')->get();
    $plain = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000001:standard:1')->firstOrFail();
    $counted = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000002:standard:2')->firstOrFail();

    expect($repeated->pluck('repeat_group')->unique()->all())->toBe([1])
        ->and($repeated->pluck('repeat_times')->unique()->all())->toBe([3])
        ->and($plain->repeat_group)->toBeNull()
        ->and($plain->repeat_times)->toBeNull()
        ->and($plain->required_count)->toBeNull()
        ->and($counted->required_count)->toBe(3);

    $leading = AzkarSegment::query()
        ->where('item_id', $counted->id)
        ->orderBy('position')
        ->firstOrFail();

    expect($leading->text_ar)->toBe(azkarOriginalArabic('entry-000002'))
        ->and($counted->source_text_sha256)->toBe(hash('sha256', azkarOriginalArabic('entry-000002')));
});

it('reassembles the Quran item byte for byte from its text and span segments', function (): void {
    azkarEnableWetImport();
    azkarWetRun(azkarFixturePath());

    $item = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000004:evening:1')->firstOrFail();
    $segments = AzkarSegment::query()->where('item_id', $item->id)->orderBy('position')->get();
    $original = azkarOriginalArabic('entry-000004');

    $rebuilt = '';

    foreach ($segments as $segment) {
        $rebuilt .= $segment->kind === 'text'
            ? (string) $segment->text_ar
            : AZKAR_QURAN_SPAN;
    }

    expect($segments->pluck('kind')->all())->toBe(['text', 'quran', 'text', 'quran'])
        ->and($segments[1]->quran_surah)->toBe(1)
        ->and($segments[1]->quran_verse_from)->toBe(1)
        ->and($segments[1]->quran_verse_to)->toBe(7)
        ->and($segments[1]->text_ar)->toBeNull()
        ->and($segments[1]->text_search)->toBeNull()
        ->and($rebuilt)->toBe($original)
        ->and($item->source_text_sha256)->toBe(hash('sha256', $original));
});

it('derives text_search from text segments with the spec normaliser', function (): void {
    azkarEnableWetImport();
    azkarWetRun(azkarFixturePath());

    $item = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000002:standard:2')->firstOrFail();
    $segment = AzkarSegment::query()->where('item_id', $item->id)->firstOrFail();
    $normalizer = new SearchTextNormalizer;

    expect($segment->text_search)->toBe($normalizer->normalize(azkarOriginalArabic('entry-000002')))
        ->and($segment->text_search)->not->toStartWith(' ')
        ->and($segment->text_ar)->toStartWith('  ');
});

it('keeps entry and item keys stable across a re-import and reports the changed upstream text', function (): void {
    azkarEnableWetImport();
    azkarWetRun(azkarFixturePath());
    $firstKeys = AzkarItem::query()->orderBy('id')->pluck('item_key')->all();

    $changed = azkarFixture();
    $changed['entries'][0]['variations'][0]['steps'][0]['items'][0]['dua']['arabic'] = '«نص تجريبي ١ — مُعدَّل»';
    $changedPath = azkarWriteCatalogue($changed);
    azkarPinTo($changedPath);

    $report = azkarWetRun($changedPath);
    $resource = Resource::query()->where('group', ResourceGroup::Azkar->value)->firstOrFail();

    expect(AzkarItem::query()->orderBy('id')->pluck('item_key')->all())->toBe($firstKeys)
        ->and($report->changedUpstreamTexts['item_keys'])->toBe(['hisn-al-muslim:entry-000001:standard:1'])
        ->and($report->resource['version_before'])->toBe(1)
        ->and($report->resource['version_after'])->toBe(2)
        ->and($resource->version)->toBe(2)
        ->and($resource->changes_floor_version)->toBe(2);
});

it('classifies sessions, browse tags, timing and provenance as the ADR says', function (): void {
    azkarEnableWetImport();
    azkarWetRun(azkarFixturePath());

    $morning = AzkarEntryCategory::query()->where('category_id', 'morning')->get();
    $evening = AzkarEntryCategory::query()->where('category_id', 'evening')->get();
    $afterWaking = AzkarEntryCategory::query()->where('category_id', 'after_waking')->get();
    $afterPrayer = AzkarEntryCategory::query()->where('category_id', 'after_prayer')->get();
    $browse = AzkarEntryCategory::query()->where('category_id', 'travel')->count();

    expect($morning->map(fn ($row): array => [$row->entry_id, $row->variation_key])->all())->toBe([[3, 'morning']])
        ->and($evening->map(fn ($row): array => [$row->entry_id, $row->variation_key])->all())->toBe([[4, 'evening']])
        ->and($afterWaking->map(fn ($row): array => [$row->entry_id, $row->variation_key])->all())->toBe([[1, '*']])
        ->and($afterPrayer->map(fn ($row): array => [$row->entry_id, $row->variation_key])->all())->toBe([[2, '*']])
        ->and($browse)->toBe(2);

    $first = AzkarEntry::query()->where('entry_key', 'hisn-al-muslim:entry-000001')->firstOrFail();
    $prayer = AzkarEntry::query()->where('entry_key', 'hisn-al-muslim:entry-000002')->firstOrFail();
    $timePeriod = AzkarEntry::query()->where('entry_key', 'hisn-al-muslim:entry-000003')->firstOrFail();

    expect($first->occasion)->toBe('after_waking')
        ->and($first->timing_type)->toBe('event_based')
        ->and($prayer->timing_type)->toBe('prayer_based')
        ->and($prayer->timing_prayer)->toBeNull()
        ->and($timePeriod->occasion)->toBeNull()
        ->and($timePeriod->timing_type)->toBe('time_period')
        ->and($first->review_status)->toBe('sourced')
        ->and($first->source_version)->toBe('0.0.4')
        ->and(AzkarChapter::query()->where('id', 1)->firstOrFail()->title_en)->toBe('FIXTURE chapter one');
});

it('keeps title_ar null for a chapter with no configured Arabic title', function (): void {
    config(['azkar.chapter_titles_ar' => []]);
    azkarEnableWetImport();

    azkarWetRun(azkarFixturePath());

    expect(AzkarChapter::query()->where('id', 1)->firstOrFail()->title_ar)->toBeNull();
});

it('takes title_ar from the configured Arabic titles, keyed by chapter number', function (): void {
    config(['azkar.chapter_titles_ar' => [1 => 'عنوان تجريبي للفصل']]);
    azkarEnableWetImport();

    azkarWetRun(azkarFixturePath());

    expect(AzkarChapter::query()->where('id', 1)->firstOrFail()->title_ar)->toBe('عنوان تجريبي للفصل');
});

it('imports English only when enabled and keeps the transliteration gated with it', function (): void {
    config(['azkar.opendua.store_english' => true]);
    azkarEnableWetImport();
    azkarWetRun(azkarFixturePath());

    $english = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000001:standard:1')->firstOrFail();
    $quran = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000004:evening:1')->firstOrFail();

    expect($english->text_en)->toBe('FIXTURE text 1 — not a dhikr')
        ->and($english->transliteration)->toBe('FIXTURE transliteration 1 — not a dhikr')
        ->and($quran->text_en)->toBeNull()
        ->and($quran->transliteration)->toBeNull();
});

function azkarOriginalArabic(string $entry): string
{
    return match ($entry) {
        'entry-000002' => '  «نص تجريبي ٢ — ليس ذكرًا»  ',
        'entry-000004' => "«نص تجريبي ٤» \u{FD3F}نص تجريبي\u{FD3E} «نص تجريبي ٥» \u{FD3F}نص تجريبي\u{FD3E}",
        default => throw new RuntimeException('Unknown fixture entry.'),
    };
}

it('production imports the rest when the entry with an unreviewed Quran passage is excluded, and lists it', function (): void {
    app()->detectEnvironment(fn (): string => 'production');
    azkarEnableWetImport();
    config([
        'azkar.quran_references' => [],
        'azkar.excluded_entries' => ['hisn-al-muslim:entry-000004' => 'quran_reference_unidentified'],
    ]);

    $report = azkarWetRun(azkarFixturePath());

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and(azkarErrorCodes($report))->toBe(['quran_reference_unreviewed'])
        ->and(AzkarEntry::query()->where('entry_key', 'hisn-al-muslim:entry-000004')->exists())->toBeFalse()
        ->and(AzkarEntry::query()->count())->toBe(3)
        ->and($report->content['excluded'])->toBe([['entry' => 'hisn-al-muslim:entry-000004', 'reason' => 'quran_reference_unidentified']]);
});

it('production still fails and writes nothing when the entry with an unreviewed Quran passage is not excluded', function (): void {
    app()->detectEnvironment(fn (): string => 'production');
    azkarEnableWetImport();
    config([
        'azkar.quran_references' => [],
        'azkar.excluded_entries' => ['hisn-al-muslim:entry-000099' => 'quran_reference_unidentified'],
    ]);

    $report = azkarWetRun(azkarFixturePath());

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(azkarErrorCodes($report))->toBe(['quran_reference_unreviewed'])
        ->and($report->content['excluded'])->toBe([['entry' => 'hisn-al-muslim:entry-000099', 'reason' => 'quran_reference_unidentified']])
        ->and(AzkarEntry::query()->count())->toBe(0)
        ->and(Resource::query()->count())->toBe(0);
});

it('leaves out an excluded entry that has no errors and lists it in the report', function (): void {
    app()->detectEnvironment(fn (): string => 'production');
    azkarEnableWetImport();
    config(['azkar.excluded_entries' => ['hisn-al-muslim:entry-000001' => 'quran_reference_unidentified']]);

    $report = azkarWetRun(azkarFixturePath());

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and(AzkarEntry::query()->where('entry_key', 'hisn-al-muslim:entry-000001')->exists())->toBeFalse()
        ->and(AzkarEntry::query()->count())->toBe(3)
        ->and($report->content['excluded'])->toBe([['entry' => 'hisn-al-muslim:entry-000001', 'reason' => 'quran_reference_unidentified']]);
});

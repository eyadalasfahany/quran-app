<?php

declare(strict_types=1);

use App\Domains\Azkar\Data\ImportPlan;
use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Data\ImportStats;
use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Azkar\Services\AzkarImportFingerprint;
use App\Domains\Content\Models\AzkarSegment;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;

/*
| ADR 0093: a partial-verse row is imported with its word pair on the segment; a range beyond its verse is refused; the
| import fingerprint moves when a word range is added, and does not depend on the word keys of whole-verse segments.
| Placeholder fixture only (tests/Fixtures/azkar/opendua-fixture.json): every text is a placeholder, the ranges are numbers.
*/

uses(RefreshDatabase::class);

const AWR_ITEM = 'hisn-al-muslim:entry-000004:evening:1';

beforeEach(function (): void {
    Bus::fake();
    config([
        'azkar.opendua.catalogue_sha256' => hash_file('sha256', awrFixturePath()),
    ]);
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'granted']);
});

afterEach(function (): void {
    app()->detectEnvironment(fn (): string => 'testing');
});

function awrFixturePath(): string
{
    return base_path('tests/Fixtures/azkar/opendua-fixture.json');
}

/**
 * The two spans of the fixture item: the first whole, the second a partial range of 2:158 (words 1 to 6).
 *
 * @param  array<int, mixed>|null  $partial  The word pair of the second span, or null for a whole verse.
 */
function awrUseSpans(?array $partial = [1, 6]): void
{
    $second = $partial === null
        ? [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture']
        : [2, 158, null, 'status' => 'reviewed', 'evidence' => 'fixture', 'words' => $partial];

    config(['azkar.quran_references' => [AWR_ITEM => [
        [1, 1, 7, 'status' => 'reviewed', 'evidence' => 'fixture'],
        $second,
    ]]]);
}

it('writes the word pair on the quran segment of a partial row, and null on whole-verse segments', function (): void {
    app()->detectEnvironment(fn (): string => 'production');
    awrUseSpans([1, 6]);

    $report = app(AzkarImporter::class)->run(awrFixturePath(), false);

    $partial = AzkarSegment::query()->where('quran_surah', 2)->firstOrFail();
    $whole = AzkarSegment::query()->where('quran_surah', 1)->firstOrFail();

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($partial->quran_verse_from)->toBe(158)
        ->and($partial->word_from)->toBe(1)
        ->and($partial->word_to)->toBe(6)
        ->and($whole->word_from)->toBeNull()
        ->and($whole->word_to)->toBeNull();
});

it('refuses a word range beyond its verse, as an invalid reference, and writes nothing', function (): void {
    app()->detectEnvironment(fn (): string => 'production');
    awrUseSpans([1, 99]);

    $report = app(AzkarImporter::class)->run(awrFixturePath(), true);
    $codes = array_map(fn (array $issue): string => $issue['code'], $report->errors());

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and($codes)->toContain('invalid_quran_reference');
});

it('moves the import fingerprint when a partial row is added to a whole-verse import', function (): void {
    app()->detectEnvironment(fn (): string => 'production');
    awrUseSpans(null);
    app(AzkarImporter::class)->run(awrFixturePath(), false);
    $before = (string) Resource::query()->where('group', 'azkar')->value('import_fingerprint');

    awrUseSpans([1, 6]);
    $report = app(AzkarImporter::class)->run(awrFixturePath(), false);
    $after = (string) Resource::query()->where('group', 'azkar')->value('import_fingerprint');

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($after)->not->toBe($before);
});

it('keeps the fingerprint of whole-verse segments the same whether or not they carry null word keys', function (): void {
    $segment = ['item_id' => 1, 'position' => 1, 'kind' => 'quran', 'text_ar' => null, 'quran_surah' => 2, 'quran_verse_from' => 1, 'quran_verse_to' => null, 'text_search' => null];
    $fingerprint = app(AzkarImportFingerprint::class);

    $without = $fingerprint->of('sha', awrPlan([$segment]));
    $withNull = $fingerprint->of('sha', awrPlan([$segment + ['word_from' => null, 'word_to' => null]]));
    $partial = $fingerprint->of('sha', awrPlan([$segment + ['word_from' => 1, 'word_to' => null]]));

    expect($withNull)->toBe($without)
        ->and($partial)->not->toBe($without);
});

/**
 * @param  list<array<string, int|string|null>>  $segments
 */
function awrPlan(array $segments): ImportPlan
{
    return new ImportPlan(
        chapters: [],
        entries: [],
        items: [],
        segments: $segments,
        categories: [],
        entryCategories: [],
        notes: [],
        recordings: [],
        stats: new ImportStats,
    );
}

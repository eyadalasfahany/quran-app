<?php

declare(strict_types=1);

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Azkar\Services\RequiredCountResolver;
use App\Domains\Azkar\Sources\AzkarSourceRegistry;
use App\Domains\Azkar\Sources\HisnMuslimSource;
use App\Domains\Content\Models\AzkarItem;
use App\Domains\Content\Models\ContentSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\File;

/*
| ADR 0031 §6 and §12 (developer, 1 Nov 2026). Placeholder texts only («نص تجريبي — ليس ذكرًا»), never a dhikr.
| The primary is the OpenDua fixture. The secondary is a placeholder hisnmuslim snapshot written per test.
|
| Fixture entries and their book numbers:
|   entry-000001 (1)  one recitation, no count  -> filled from the secondary (REPEAT 3)
|   entry-000002 (2)  one recitation, count 3   -> the secondary says 4: primary kept, warning
|   entry-000003 (3)  a repeat group           -> counted by the group, never matched
|   entry-000004 (4)  one recitation, no count  -> the secondary has two dhikr under 4: ambiguous, stays null
*/

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Bus::fake();
    config([
        'azkar.opendua.catalogue_sha256' => hash_file('sha256', rcFixturePath()),
        'azkar.quran_references' => [
            'hisn-al-muslim:entry-000004:evening:1' => [[1, 1, 7, 'status' => 'reviewed', 'evidence' => 'fixture'], [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture']],
        ],
        'azkar.hisnmuslim.snapshot_date' => '2001-02-03',
    ]);
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'granted']);
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/azkar-rc'));
});

function rcFixturePath(): string
{
    return base_path('tests/Fixtures/azkar/opendua-fixture.json');
}

/**
 * The fixture with book numbers as sourceReference, as the real OpenDua catalogue has them (its fixture text is a
 * placeholder). Entry n gets book number n.
 *
 * @return array<string, mixed>
 */
function rcPrimaryCatalogue(): array
{
    /** @var array<string, mixed> $catalogue */
    $catalogue = json_decode((string) file_get_contents(rcFixturePath()), true, 512, JSON_THROW_ON_ERROR);

    foreach ($catalogue['entries'] as $index => $entry) {
        $catalogue['entries'][$index]['sourceReference'] = (string) ($index + 1);
    }

    return $catalogue;
}

/**
 * Writes the numbered primary catalogue and pins its SHA-256 in config. Returns its path.
 */
function rcPrimaryPath(): string
{
    $path = storage_path('framework/testing/azkar-rc/primary-'.bin2hex(random_bytes(4)).'.json');
    File::ensureDirectoryExists(dirname($path));
    File::put($path, (string) json_encode(rcPrimaryCatalogue(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    config(['azkar.opendua.catalogue_sha256' => hash_file('sha256', $path)]);

    return $path;
}

/**
 * One placeholder hisnmuslim entry. Its ID is the book number.
 *
 * @return array<string, int|string>
 */
function rcEntry(int $id, int $repeat): array
{
    return ['ID' => $id, 'ARABIC_TEXT' => '«نص تجريبي '.$id.' — ليس ذكرًا»', 'REPEAT' => $repeat];
}

/**
 * Writes a hisnmuslim-shaped snapshot with a manifest and pins its SHA-256 in config. Returns the directory.
 *
 * @param  array<string, list<array<string, int|string>>>  $chapters  Chapter number => entries.
 */
function rcWriteSnapshot(array $chapters): string
{
    $dir = storage_path('framework/testing/azkar-rc/'.bin2hex(random_bytes(6)));
    File::ensureDirectoryExists($dir);

    $index = ['العربية' => array_map(
        fn (string $number): array => ['ID' => (int) $number, 'TITLE' => '«عنوان تجريبي '.$number.'»', 'AUDIO_URL' => '', 'TEXT' => ''],
        array_keys($chapters),
    )];

    $files = ['index.json' => (string) json_encode($index, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)];

    foreach ($chapters as $number => $entries) {
        $files[$number.'.json'] = (string) json_encode(['«عنوان تجريبي '.$number.'»' => $entries], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }

    $hashes = [];

    foreach ($files as $name => $bytes) {
        File::put($dir.'/'.$name, $bytes);
        $hashes[$name] = hash('sha256', $bytes);
    }

    ksort($hashes);
    $sha = hash('sha256', (string) json_encode($hashes, JSON_THROW_ON_ERROR));

    File::put($dir.'/manifest.json', (string) json_encode(['source' => 'hisnmuslim', 'date' => '2001-02-03', 'files' => $hashes, 'sha256' => $sha], JSON_THROW_ON_ERROR));
    config(['azkar.hisnmuslim.snapshot_sha256' => $sha]);

    return $dir;
}

function rcDefaultSnapshot(): string
{
    return rcWriteSnapshot([
        '1' => [rcEntry(1, 3), rcEntry(2, 4)],
        '27' => [rcEntry(3, 1), rcEntry(4, 2), rcEntry(4, 1)],
    ]);
}

function rcUnlockSecondary(): void
{
    ContentSource::query()->where('code', 'hisnmuslim')->update(['permission_status' => 'granted']);
}

function rcWetRun(string $secondaryPath): ImportReport
{
    return app(AzkarImporter::class)->run(rcPrimaryPath(), false, false, false, null, $secondaryPath);
}

/**
 * @return list<string>
 */
function rcWarningCodes(ImportReport $report): array
{
    return array_values(array_map(fn (array $issue): string => $issue['code'], $report->warnings()));
}

it('fills a missing count from the secondary source and records that it came from there', function (): void {
    rcUnlockSecondary();

    $report = rcWetRun(rcDefaultSnapshot());

    $filled = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000001:standard:1')->firstOrFail();
    $primary = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000002:standard:2')->firstOrFail();
    $none = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000004:evening:1')->firstOrFail();

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($filled->required_count)->toBe(3)
        ->and($filled->required_count_source)->toBe('hisnmuslim')
        ->and($primary->required_count)->toBe(3)
        ->and($primary->required_count_source)->toBe('opendua')
        ->and($none->required_count)->toBeNull()
        ->and($none->required_count_source)->toBeNull()
        ->and($report->sourced['required_count_sources'])->toBe(['opendua' => 1, 'hisnmuslim' => 1])
        ->and($report->sourced['items_with_required_count'])->toBe(2)
        ->and($report->sourced['required_count_secondary'])->toBe(['code' => 'hisnmuslim', 'used' => true, 'reason' => null]);
});

it('keeps the primary count when the secondary differs, and lists the difference as a warning', function (): void {
    rcUnlockSecondary();

    $report = rcWetRun(rcDefaultSnapshot());

    $kept = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000002:standard:2')->firstOrFail();

    expect($kept->required_count)->toBe(3)
        ->and($kept->required_count_source)->toBe('opendua')
        ->and(rcWarningCodes($report))->toContain('required_count_conflict')
        ->and($report->sourced['required_count_conflicts'])->toBe([[
            'item' => 'hisn-al-muslim:entry-000002:standard:2',
            'entry_index' => 1,
            'entry' => 'hisn-al-muslim:entry-000002',
            'primary' => 3,
            'secondary' => 4,
        ]])
        ->and($report->errors())->toBe([]);
});

it('leaves an ambiguous match null and reports it, and never guesses', function (): void {
    rcUnlockSecondary();

    $report = rcWetRun(rcDefaultSnapshot());

    $ambiguous = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000004:evening:1')->firstOrFail();
    $group = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000003:morning:2')->firstOrFail();

    expect($ambiguous->required_count)->toBeNull()
        ->and($ambiguous->required_count_source)->toBeNull()
        ->and($group->required_count)->toBeNull()
        ->and($group->required_count_source)->toBeNull()
        ->and(rcWarningCodes($report))->toContain('required_count_ambiguous')
        ->and($report->sourced['required_count_ambiguous'])->toBe([[
            'item' => 'hisn-al-muslim:entry-000004:evening:1',
            'entry_index' => 3,
            'entry' => 'hisn-al-muslim:entry-000004',
            'primary_recitations' => 1,
            'secondary_dhikr' => 2,
        ]]);
});

it('pairs recitations under one book number by position only when both sides have the same number', function (): void {
    $primary = rcPrimaryCatalogue();
    $twin = $primary['entries'][0];
    $twin['id'] = 'entry-000900';
    $primary['entries'][] = $twin;

    $secondaryPath = rcWriteSnapshot(['1' => [rcEntry(1, 3), rcEntry(1, 5)], '27' => []]);
    $secondary = app(HisnMuslimSource::class)->parse($secondaryPath)->data;

    $plan = app(RequiredCountResolver::class)->resolve(
        $primary,
        app(AzkarSourceRegistry::class)->for('opendua')->profile(),
        $secondary,
        'hisnmuslim',
    );

    expect($plan->fills)->toBe([
        'hisn-al-muslim:entry-000001:standard:1' => ['count' => 3, 'source' => 'hisnmuslim'],
        'hisn-al-muslim:entry-000900:standard:1' => ['count' => 5, 'source' => 'hisnmuslim'],
    ])
        ->and($plan->ambiguous)->toBe([]);
});

it('leaves the counts as the primary has them when the secondary cannot be read', function (): void {
    rcUnlockSecondary();

    $report = rcWetRun(storage_path('framework/testing/azkar-rc/missing'));

    $filled = AzkarItem::query()->where('item_key', 'hisn-al-muslim:entry-000001:standard:1')->firstOrFail();

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($filled->required_count)->toBeNull()
        ->and($report->sourced['required_count_secondary']['used'])->toBeFalse()
        ->and($report->sourced['required_count_secondary']['reason'])->toBe('unavailable: unreadable_file');
});

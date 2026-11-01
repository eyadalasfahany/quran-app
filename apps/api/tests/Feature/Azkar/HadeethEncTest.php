<?php

declare(strict_types=1);

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Azkar\Services\HadeethEncLinker;
use App\Domains\Azkar\Services\HadeethEncNotes;
use App\Domains\Azkar\Sources\HadeethEncSnapshot;
use App\Domains\Azkar\Sources\HadeethEncSnapshotter;
use App\Domains\Content\Models\ContentSource;
use App\Support\QuranText\SearchTextNormalizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

/*
| ADR 0031 §12. Placeholder texts only: every hadith, explanation and dhikr here is «نص تجريبي» or FIXTURE, never real
| text. The snapshot date is a test date, so cleanup never touches a real snapshot.
*/

uses(RefreshDatabase::class);

const HES_DATE = '2001-02-03';

const HES_DHIKR = 'FIXTURE dhikr text that is long enough to be linked by the matcher in this test';

beforeEach(function (): void {
    config(['azkar.hadeethenc.gap_ms' => 0, 'azkar.hadeethenc.retry_delay_ms' => 0, 'azkar.hadeethenc.category_ids' => [268]]);
    Http::preventStrayRequests();
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('app/azkar/hadeethenc/'.HES_DATE));
    app()->detectEnvironment(fn (): string => 'testing');
});

/**
 * @param  array<string, mixed>  $value
 */
function hesJson(array $value): string
{
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}

/**
 * A hadith record with placeholder text. Note the «hints» key: it is the benefits list and must never be stored.
 *
 * @return array<string, mixed>
 */
function hesRecord(int $id, string $hadeeth): array
{
    return [
        'id' => (string) $id,
        'title' => 'FIXTURE title '.$id,
        'hadeeth' => $hadeeth,
        'attribution' => 'FIXTURE attribution '.$id,
        'grade' => 'FIXTURE grade '.$id,
        'explanation' => 'FIXTURE explanation '.$id.' — not a dhikr',
        'hints' => ['FIXTURE benefit — must not be stored'],
        'categories' => ['268'],
        'reference' => 'FIXTURE reference',
    ];
}

function hesFakeSource(): void
{
    Http::fake(function (Request $request) {
        $url = $request->url();

        return match (true) {
            str_contains($url, '/categories/list/') => Http::response(hesJson([
                ['id' => '268', 'title' => 'FIXTURE parent', 'hadeeths_count' => '2', 'parent_id' => null],
                ['id' => '301', 'title' => 'FIXTURE child', 'hadeeths_count' => '1', 'parent_id' => '268'],
                ['id' => '999', 'title' => 'FIXTURE unrelated', 'hadeeths_count' => '1', 'parent_id' => null],
            ])),
            str_contains($url, 'category_id=268') && str_contains($url, 'page=1') => Http::response(hesJson([
                'data' => [['id' => '1', 'title' => 'FIXTURE'], ['id' => '2', 'title' => 'FIXTURE']],
                'meta' => ['current_page' => 1, 'last_page' => 2, 'total_items' => 3, 'per_page' => 2],
            ])),
            str_contains($url, 'category_id=268') && str_contains($url, 'page=2') => Http::response(hesJson([
                'data' => [],
                'meta' => ['current_page' => 2, 'last_page' => 2, 'total_items' => 3, 'per_page' => 2],
            ])),
            str_contains($url, 'category_id=301') => Http::response(hesJson([
                'data' => [['id' => '3', 'title' => 'FIXTURE']],
                'meta' => ['current_page' => 1, 'last_page' => 1, 'total_items' => 1, 'per_page' => 100],
            ])),
            str_contains($url, 'hadeeths/one/') && str_contains($url, 'id=1') => Http::response(hesJson(hesRecord(1, HES_DHIKR.' ('.'FIXTURE hadith 1'.')'))),
            str_contains($url, 'hadeeths/one/') && str_contains($url, 'id=2') => Http::response(hesJson(hesRecord(2, 'FIXTURE hadith 2 — no dhikr here'))),
            str_contains($url, 'hadeeths/one/') && str_contains($url, 'id=3') => Http::response(hesJson(hesRecord(3, 'FIXTURE hadith 3'))),
            default => Http::response('', 404),
        };
    });
}

it('snapshots the configured categories and their children, every list page and each hadith once, with a pinned manifest', function (): void {
    hesFakeSource();

    $result = app(HadeethEncSnapshotter::class)->take(HES_DATE);

    $manifest = json_decode((string) File::get($result['directory'].'/manifest.json'), true, 512, JSON_THROW_ON_ERROR);

    expect($result['categories'])->toBe(2)
        ->and($result['list_pages'])->toBe(3)
        ->and($result['hadiths'])->toBe(3)
        ->and($manifest['categories'])->toBe([268, 301])
        ->and($manifest['sha256'])->toBe($result['manifest_sha256']);

    Http::assertNotSent(fn (Request $request): bool => str_contains($request->url(), 'category_id=999'));
});

it('refuses a snapshot when a hadith id does not come back as requested', function (): void {
    Http::fake(function (Request $request) {
        $url = $request->url();

        return match (true) {
            str_contains($url, '/categories/list/') => Http::response(hesJson([['id' => '268', 'title' => 'FIXTURE', 'hadeeths_count' => '1', 'parent_id' => null]])),
            str_contains($url, 'hadeeths/list/') => Http::response(hesJson(['data' => [['id' => '1']], 'meta' => ['current_page' => 1, 'last_page' => 1]])),
            str_contains($url, 'hadeeths/one/') => Http::response(hesJson(hesRecord(9, 'FIXTURE'))),
            default => Http::response('', 404),
        };
    });

    expect(fn () => app(HadeethEncSnapshotter::class)->take(HES_DATE))->toThrow(SnapshotException::class, 'does not match the id');
});

it('links a dhikr to a hadith only when the normalised dhikr is contained and long enough', function (): void {
    $catalogue = ['entries' => [
        ['id' => 'entry-000001', 'variations' => [['id' => 'standard', 'steps' => [['type' => 'recitation', 'items' => [['dua' => ['id' => 'd', 'arabic' => HES_DHIKR]]]]]]]],
        ['id' => 'entry-000002', 'variations' => [['id' => 'standard', 'steps' => [['type' => 'recitation', 'items' => [['dua' => ['id' => 'e', 'arabic' => 'FIXTURE short']]]]]]]],
    ]];
    $records = [1 => hesRecord(1, HES_DHIKR.' FIXTURE hadith 1'), 2 => hesRecord(2, 'FIXTURE hadith two without it')];

    $result = app(HadeethEncLinker::class)->build($catalogue, $records, []);

    expect($result['rows'])->toBe(['hisn-al-muslim:entry-000001' => [['hadeeth_id' => 1, 'status' => 'candidate', 'evidence' => 'contains:'.mb_strlen(app(SearchTextNormalizer::class)->normalize(HES_DHIKR))]]])
        ->and($result['stats']['links'])->toBe(1);
});

it('keeps a reviewed link exactly as it is when the links are rebuilt', function (): void {
    $catalogue = ['entries' => [['id' => 'entry-000001', 'variations' => [['id' => 'standard', 'steps' => [['type' => 'recitation', 'items' => [['dua' => ['id' => 'd', 'arabic' => HES_DHIKR]]]]]]]]]];
    $existing = ['hisn-al-muslim:entry-000001' => [['hadeeth_id' => 7, 'status' => 'reviewed', 'evidence' => 'checked']]];

    $result = app(HadeethEncLinker::class)->build($catalogue, [1 => hesRecord(1, HES_DHIKR)], $existing);

    expect($result['rows']['hisn-al-muslim:entry-000001'])->toContain(['hadeeth_id' => 7, 'status' => 'reviewed', 'evidence' => 'checked']);
});

it('writes explanation, grade and reference notes from reviewed links in production, and candidates elsewhere only', function (): void {
    $links = ['hisn-al-muslim:entry-000001' => [
        ['hadeeth_id' => 1, 'status' => 'reviewed', 'evidence' => 'checked'],
        ['hadeeth_id' => 2, 'status' => 'candidate', 'evidence' => 'contains:50'],
    ]];
    $records = [1 => hesRecord(1, 'FIXTURE'), 2 => hesRecord(2, 'FIXTURE')];

    $production = app(HadeethEncNotes::class)->build($links, $records, true);
    $local = app(HadeethEncNotes::class)->build($links, $records, false);

    $kinds = array_column($production['notes']['hisn-al-muslim:entry-000001'], 'kind');

    expect($kinds)->toBe(['explanation', 'grade', 'reference'])
        ->and($production['notes']['hisn-al-muslim:entry-000001'][0]['source_url'])->toBe('https://hadeethenc.com/ar/browse/hadith/1')
        ->and($production['notes']['hisn-al-muslim:entry-000001'][1]['grader'])->toBeNull()
        ->and($production['notes']['hisn-al-muslim:entry-000001'][2]['text_ar'])->toBe('FIXTURE attribution 1')
        ->and($local['notes']['hisn-al-muslim:entry-000001'])->toHaveCount(6)
        ->and($local['candidates'])->toBe(['hisn-al-muslim:entry-000001 → 2'])
        ->and(json_encode($local['notes']))->not->toContain('FIXTURE benefit');
});

it('reports enrichment as not run while the hadeethenc source is pending, and writes no notes', function (): void {
    config([
        'azkar.opendua.catalogue_sha256' => hash_file('sha256', base_path('tests/Fixtures/azkar/opendua-fixture.json')),
        'azkar.hadeethenc.enabled' => true,
    ]);

    $report = app(AzkarImporter::class)->run(base_path('tests/Fixtures/azkar/opendua-fixture.json'), true);

    expect($report->gated['hadeethenc']['enabled'])->toBeFalse()
        ->and($report->gated['hadeethenc']['reason'])->toContain('not granted');
});

it('the hadeethenc source is seeded pending, and the local unlock sets it granted, never in production', function (): void {
    expect(ContentSource::query()->where('code', 'hadeethenc')->value('permission_status')?->value)->toBe('pending');

    $this->artisan('azkar:source-permission', ['status' => 'granted', '--source' => 'hadeethenc'])->assertExitCode(0);

    expect(ContentSource::query()->where('code', 'hadeethenc')->value('permission_status')?->value)->toBe('granted');

    app()->detectEnvironment(fn (): string => 'production');

    $this->artisan('azkar:source-permission', ['status' => 'pending', '--source' => 'hadeethenc'])->assertExitCode(1);
});

it('the snapshot the importer reads must match its pin', function (): void {
    File::ensureDirectoryExists(storage_path('app/azkar/hadeethenc/'.HES_DATE));
    File::put(storage_path('app/azkar/hadeethenc/'.HES_DATE.'/manifest.json'), hesJson(['files' => [], 'sha256' => str_repeat('1', 64)]));
    config(['azkar.hadeethenc.snapshot_sha256' => str_repeat('0', 64)]);

    expect(fn () => app(HadeethEncSnapshot::class)->load(storage_path('app/azkar/hadeethenc/'.HES_DATE)))
        ->toThrow(SnapshotException::class, 'pinned SHA-256');
});

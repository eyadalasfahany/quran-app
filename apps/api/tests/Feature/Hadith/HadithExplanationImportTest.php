<?php

declare(strict_types=1);

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Sources\HadeethEncSnapshotter;
use App\Domains\Content\Models\ContentPack;
use App\Domains\Content\Models\Resource;
use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithExplanationException;
use App\Domains\Hadith\Models\HadithExplanation;
use App\Domains\Hadith\Models\HadithExplanationLink;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Services\HadithExplanationImporter;
use App\Domains\Hadith\Services\HadithExplanationLinksFile;
use App\Support\Storage\SourceCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

const HADITH_EXPL_DATE = '2001-04-05';

const HADITH_EXPL_BODY = "FIXTURE explanation 1 — not an explanation \u{064E}\u{200F} ";

beforeEach(function (): void {
    config([
        'hadith_explanations.hadeethenc.gap_ms' => 0,
        'hadith_explanations.hadeethenc.retry_delay_ms' => 0,
        'hadith_explanations.hadeethenc.category_ids' => [1],
        'hadith_explanations.hadeethenc.snapshot_date' => HADITH_EXPL_DATE,
        'hadith.data_files' => [],
    ]);
    Http::preventStrayRequests();
    Storage::fake('local');
    File::ensureDirectoryExists(hadithExplDataDirectory());
    $this->app->instance(HadithDataFiles::class, new HadithDataFiles(hadithExplDataDirectory()));
});

afterEach(function (): void {
    File::deleteDirectory(SourceCache::path('hadith_explanations/hadeethenc/'.HADITH_EXPL_DATE));
    File::deleteDirectory(hadithExplDataDirectory());
});

/**
 * A per-process temp base for the links file, so no test reads or writes database/data/hadith.
 */
function hadithExplDataDirectory(): string
{
    return storage_path('framework/testing/hadith-expl-'.getmypid());
}

/**
 * Takes a one-record HadeethEnc snapshot of placeholder text and pins it in config. Returns the manifest SHA-256.
 */
function hadithExplPinSnapshot(): string
{
    Http::fake(function (Request $request) {
        $url = $request->url();
        $json = fn (array $value): string => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        return match (true) {
            str_contains($url, '/categories/list/') => Http::response($json([
                ['id' => '1', 'title' => 'FIXTURE cat 1', 'hadeeths_count' => '1', 'parent_id' => null],
            ])),
            str_contains($url, 'category_id=1') => Http::response($json([
                'data' => [['id' => '7']],
                'meta' => ['current_page' => 1, 'last_page' => 1, 'total_items' => 1, 'per_page' => 100],
            ])),
            str_contains($url, 'hadeeths/one/') => Http::response($json([
                'id' => 7,
                'title' => 'نص تجريبي ١ — ليس شرحًا',
                'hadeeth' => 'تجريبي ألف باءة جيمة دالة',
                'attribution' => 'FIXTURE — رواه البخاري',
                'explanation' => HADITH_EXPL_BODY,
                'hints' => ['نص تجريبي ٢ — ليس فائدة'],
                'words_meanings' => 'نص تجريبي ٣',
                'hadeeth_intro' => null,
                'reference' => 'FIXTURE (1)',
                'grade' => 'FIXTURE grade — not a grade',
            ])),
            default => Http::response('', 404),
        };
    });

    $result = app(HadeethEncSnapshotter::class)->take(HADITH_EXPL_DATE, 'hadith_explanations.hadeethenc', 'hadith_explanations/hadeethenc');
    config(['hadith_explanations.hadeethenc.snapshot_sha256' => $result['manifest_sha256']]);

    return $result['manifest_sha256'];
}

/**
 * Writes a links file for the pinned snapshot and pins its bytes in config, as the mapper and the developer do.
 *
 * @param  list<array<string, mixed>>|null  $links
 */
function hadithExplPinLinks(string $snapshotSha, ?array $links = null, ?string $sha = null): void
{
    $links ??= [[
        'collection' => 'bukhari',
        'number' => '1',
        'explanation_id' => 7,
        'status' => 'accepted',
        'evidence' => 'shared=10;size=10;second=7',
    ]];
    $bytes = app(HadithExplanationLinksFile::class)->encode($snapshotSha, ['min_containment_percent' => 70, 'min_gap_percent' => 10], $links);
    File::ensureDirectoryExists(hadithExplDataDirectory().'/explanations');
    file_put_contents(hadithExplDataDirectory().'/explanations/hadeethenc.json', $bytes);
    config(['hadith.data_files' => ['explanations/hadeethenc.json' => $sha ?? hash('sha256', $bytes)]]);
}

it('imports only the linked explanation, byte for byte, and keeps the grade out of the pack', function (): void {
    $snapshotSha = hadithExplPinSnapshot();
    hadithExplPinLinks($snapshotSha);

    $result = app(HadithExplanationImporter::class)->run(false, true);

    expect($result['status'])->toBe('imported')
        ->and($result['explanations'])->toBe(1)
        ->and($result['links'])->toBe(1);

    $row = HadithExplanation::query()->where('id', 7)->firstOrFail();

    expect($row->body_ar)->toBe(HADITH_EXPL_BODY)
        ->and(bin2hex((string) $row->body_ar))->toBe(bin2hex(HADITH_EXPL_BODY))
        ->and($row->benefits_ar)->toBe('["نص تجريبي ٢ — ليس فائدة"]')
        ->and($row->words_ar)->toBe('نص تجريبي ٣')
        ->and($row->intro_ar)->toBeNull()
        ->and($row->grade_ar)->toBe('FIXTURE grade — not a grade')
        ->and($row->source_url)->toEndWith('/7')
        ->and(HadithExplanationLink::query()->where('collection_slug', 'bukhari')->where('hadith_number', '1')->exists())->toBeTrue();

    $resource = Resource::query()->where('group', 'hadith_explanations')->firstOrFail();
    $pack = ContentPack::query()->where('resource_id', $resource->id)->firstOrFail();

    expect(Storage::disk('local')->exists($pack->path))->toBeTrue();
});

it('is idempotent: a second import of the same inputs is unchanged', function (): void {
    $snapshotSha = hadithExplPinSnapshot();
    hadithExplPinLinks($snapshotSha);

    $first = app(HadithExplanationImporter::class)->run(false, false);
    $second = app(HadithExplanationImporter::class)->run(false, false);

    expect($first['status'])->toBe('imported')
        ->and($second['status'])->toBe('unchanged')
        ->and($second['version'])->toBe($first['version'])
        ->and(HadithExplanation::query()->count())->toBe(1);
});

it('does not write on a dry run', function (): void {
    $snapshotSha = hadithExplPinSnapshot();
    hadithExplPinLinks($snapshotSha);

    $result = app(HadithExplanationImporter::class)->run(true, false);

    expect($result['status'])->toBe('dry_run')
        ->and(HadithExplanation::query()->count())->toBe(0)
        ->and(HadithExplanationLink::query()->count())->toBe(0);
});

it('reports a missing snapshot and a missing links file without an error', function (): void {
    expect(app(HadithExplanationImporter::class)->run()['status'])->toBe('no_snapshot');

    hadithExplPinSnapshot();

    expect(app(HadithExplanationImporter::class)->run()['status'])->toBe('no_links');
});

it('refuses a snapshot whose manifest differs from its pin', function (): void {
    hadithExplPinSnapshot();
    config(['hadith_explanations.hadeethenc.snapshot_sha256' => str_repeat('a', 64)]);

    // The snapshot loader checks the pin first (SnapshotException); the command reports it.
    expect(fn () => app(HadithExplanationImporter::class)->run())->toThrow(SnapshotException::class);
});

it('refuses a links file whose bytes differ from its pin', function (): void {
    $snapshotSha = hadithExplPinSnapshot();
    hadithExplPinLinks($snapshotSha, sha: str_repeat('b', 64));

    expect(fn () => app(HadithExplanationImporter::class)->run())->toThrow(HadithDataFileException::class);
});

it('refuses a links file made from another snapshot', function (): void {
    $snapshotSha = hadithExplPinSnapshot();
    hadithExplPinLinks(str_repeat('c', 64));

    expect($snapshotSha)->not->toBe(str_repeat('c', 64))
        ->and(fn () => app(HadithExplanationImporter::class)->run())->toThrow(HadithExplanationException::class);
});

it('refuses a link to a record the snapshot does not hold', function (): void {
    $snapshotSha = hadithExplPinSnapshot();
    hadithExplPinLinks($snapshotSha, [[
        'collection' => 'bukhari',
        'number' => '1',
        'explanation_id' => 999,
        'status' => 'accepted',
        'evidence' => 'shared=10;size=10;second=7',
    ]]);

    expect(fn () => app(HadithExplanationImporter::class)->run())->toThrow(HadithExplanationException::class);
});

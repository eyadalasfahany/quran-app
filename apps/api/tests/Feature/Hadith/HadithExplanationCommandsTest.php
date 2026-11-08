<?php

declare(strict_types=1);

use App\Domains\Hadith\Console\ExplanationsSnapshotCommand;
use App\Support\Storage\SourceCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

const HADITH_EXPL_CMD_DATE = '2001-06-07';

beforeEach(function (): void {
    config([
        'hadith_explanations.hadeethenc.gap_ms' => 0,
        'hadith_explanations.hadeethenc.retry_delay_ms' => 0,
        'hadith_explanations.hadeethenc.category_ids' => [1],
        'hadith_explanations.hadeethenc.snapshot_date' => HADITH_EXPL_CMD_DATE,
        'hadith_explanations.hadeethenc.snapshot_sha256' => '',
    ]);
    Http::preventStrayRequests();
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
            str_contains($url, 'hadeeths/one/') => Http::response($json(['id' => 7, 'hadeeth' => 'FIXTURE text 1 — not a hadith'])),
            default => Http::response('', 404),
        };
    });
});

afterEach(function (): void {
    File::deleteDirectory(SourceCache::path('hadith_explanations/hadeethenc/'.HADITH_EXPL_CMD_DATE));
});

it('writes a snapshot and prints the pin to copy into config', function (): void {
    $this->artisan(ExplanationsSnapshotCommand::class, ['--date' => HADITH_EXPL_CMD_DATE])
        ->expectsOutputToContain("'snapshot_sha256' =>")
        ->assertSuccessful();

    expect(is_file(SourceCache::path('hadith_explanations/hadeethenc/'.HADITH_EXPL_CMD_DATE.'/manifest.json')))->toBeTrue();
});

it('sends a User-Agent with every request', function (): void {
    $this->artisan(ExplanationsSnapshotCommand::class, ['--date' => HADITH_EXPL_CMD_DATE])->assertSuccessful();

    Http::assertSent(fn (Request $request): bool => str_starts_with($request->header('User-Agent')[0] ?? '', 'Taybah/'));
});

it('deletes a pinned snapshot whose manifest does not match the pin', function (): void {
    config(['hadith_explanations.hadeethenc.snapshot_sha256' => str_repeat('d', 64)]);

    $this->artisan(ExplanationsSnapshotCommand::class, ['--pinned' => true])->assertFailed();

    expect(is_dir(SourceCache::path('hadith_explanations/hadeethenc/'.HADITH_EXPL_CMD_DATE)))->toBeFalse();
});

it('refuses --pinned together with --date', function (): void {
    $this->artisan(ExplanationsSnapshotCommand::class, ['--pinned' => true, '--date' => HADITH_EXPL_CMD_DATE])->assertFailed();
});

it('maps nothing without a pinned snapshot', function (): void {
    config(['hadith_explanations.hadeethenc.snapshot_sha256' => '']);

    $this->artisan('hadith:map-explanations')->assertFailed();
});

it('fetches a record again when the body is not JSON', function (): void {
    $oneCalls = 0;
    // A fresh factory: a second Http::fake would sit behind the stub from beforeEach, which matches first.
    Http::swap(new Factory);
    Http::preventStrayRequests();
    Http::fake(function (Request $request) use (&$oneCalls) {
        $url = $request->url();

        if (str_contains($url, 'hadeeths/one/')) {
            $oneCalls++;

            return $oneCalls === 1
                ? Http::response('{"id": 7, "hadeeth": "FIXTURE truncated')
                : Http::response(json_encode(['id' => 7, 'hadeeth' => 'FIXTURE text 1 — not a hadith'], JSON_UNESCAPED_UNICODE));
        }

        return str_contains($url, '/categories/list/')
            ? Http::response(json_encode([['id' => '1', 'title' => 'FIXTURE cat 1', 'hadeeths_count' => '1', 'parent_id' => null]]))
            : Http::response(json_encode(['data' => [['id' => '7']], 'meta' => ['current_page' => 1, 'last_page' => 1]]));
    });

    $this->artisan(ExplanationsSnapshotCommand::class, ['--date' => HADITH_EXPL_CMD_DATE])->assertSuccessful();

    expect($oneCalls)->toBe(2);
});

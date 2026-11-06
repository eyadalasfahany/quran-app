<?php

declare(strict_types=1);

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Sources\HadeethEncSnapshot;
use App\Domains\Azkar\Sources\HadeethEncSnapshotter;
use App\Support\Storage\SourceCache;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

const DUAS_HES_DATE = '2001-04-05';

beforeEach(function (): void {
    config([
        'duas.hadeethenc.gap_ms' => 0,
        'duas.hadeethenc.retry_delay_ms' => 0,
        'duas.hadeethenc.category_ids' => [301, 302],
        'azkar.hadeethenc.gap_ms' => 0,
        'azkar.hadeethenc.retry_delay_ms' => 0,
        'azkar.hadeethenc.category_ids' => [268],
    ]);
    Http::preventStrayRequests();
});

afterEach(function (): void {
    File::deleteDirectory(SourceCache::path('duas/hadeethenc/'.DUAS_HES_DATE));
    File::deleteDirectory(SourceCache::path('azkar/hadeethenc/2001-02-03'));
});

/**
 * @param  array<string, mixed>  $value
 */
function duasHesJson(array $value): string
{
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}

function duasHesFakeSource(): void
{
    Http::fake(function (Request $request) {
        $url = $request->url();

        return match (true) {
            str_contains($url, '/categories/list/') => Http::response(duasHesJson([
                ['id' => '301', 'title' => 'FIXTURE cat 301', 'hadeeths_count' => '1', 'parent_id' => null],
                ['id' => '302', 'title' => 'FIXTURE cat 302', 'hadeeths_count' => '1', 'parent_id' => null],
            ])),
            str_contains($url, 'category_id=301') => Http::response(duasHesJson([
                'data' => [['id' => '10', 'title' => 'FIXTURE']],
                'meta' => ['current_page' => 1, 'last_page' => 1, 'total_items' => 1, 'per_page' => 100],
            ])),
            str_contains($url, 'category_id=302') => Http::response(duasHesJson([
                'data' => [['id' => '11', 'title' => 'FIXTURE']],
                'meta' => ['current_page' => 1, 'last_page' => 1, 'total_items' => 1, 'per_page' => 100],
            ])),
            str_contains($url, 'hadeeths/one/') && str_contains($url, 'id=10') => Http::response(duasHesJson([
                'id' => '10',
                'title' => 'FIXTURE title 10',
                'hadeeth' => 'FIXTURE hadith 10 — not a dua',
                'attribution' => 'FIXTURE attribution',
            ])),
            str_contains($url, 'hadeeths/one/') && str_contains($url, 'id=11') => Http::response(duasHesJson([
                'id' => '11',
                'title' => 'FIXTURE title 11',
                'hadeeth' => 'FIXTURE hadith 11 — not a dua',
                'attribution' => 'FIXTURE attribution',
            ])),
            default => Http::response('', 404),
        };
    });
}

it('writes the Duas snapshot under the source cache at duas/ with a manifest that lists every file hash', function (): void {
    duasHesFakeSource();

    $result = app(HadeethEncSnapshotter::class)->take(DUAS_HES_DATE, 'duas.hadeethenc', 'duas/hadeethenc');

    expect(str_replace('\\', '/', $result['directory']))->toContain('duas/hadeethenc')
        ->and($result['hadiths'])->toBe(2);

    $manifest = json_decode((string) File::get($result['directory'].'/manifest.json'), true, 512, JSON_THROW_ON_ERROR);

    expect($manifest['sha256'])->toBe($result['manifest_sha256'])
        ->and($manifest['files'])->toHaveCount(count($manifest['files']))
        ->and(collect($manifest['files'])->keys()->sort()->values()->all())->toBe([
            'categories.json',
            'hadith-10.json',
            'hadith-11.json',
            'list-301-1.json',
            'list-302-1.json',
        ]);

    foreach ($manifest['files'] as $name => $expectedHash) {
        $bytes = File::get($result['directory'].'/'.$name);
        expect(hash('sha256', $bytes))->toBe($expectedHash);
    }
});

it('refuses a Duas snapshot when a file hash does not match the manifest', function (): void {
    duasHesFakeSource();

    $result = app(HadeethEncSnapshotter::class)->take(DUAS_HES_DATE, 'duas.hadeethenc', 'duas/hadeethenc');
    config(['duas.hadeethenc.snapshot_sha256' => $result['manifest_sha256']]);

    File::put($result['directory'].'/hadith-10.json', '{"corrupt":true}');

    expect(fn () => app(HadeethEncSnapshot::class)->load($result['directory'], 'duas.hadeethenc'))
        ->toThrow(SnapshotException::class, 'manifest hash.');
});

it('still writes the Azkar snapshot directory when called with default parameters', function (): void {
    Http::fake(function (Request $request) {
        $url = $request->url();

        return match (true) {
            str_contains($url, '/categories/list/') => Http::response(duasHesJson([
                ['id' => '268', 'title' => 'FIXTURE parent', 'hadeeths_count' => '1', 'parent_id' => null],
            ])),
            str_contains($url, 'hadeeths/list/') => Http::response(duasHesJson([
                'data' => [['id' => '1', 'title' => 'FIXTURE']],
                'meta' => ['current_page' => 1, 'last_page' => 1],
            ])),
            str_contains($url, 'hadeeths/one/') => Http::response(duasHesJson([
                'id' => '1',
                'title' => 'FIXTURE',
                'hadeeth' => 'FIXTURE hadith — not a dua',
            ])),
            default => Http::response('', 404),
        };
    });

    $date = '2001-02-03';
    $result = app(HadeethEncSnapshotter::class)->take($date);

    expect(str_replace('\\', '/', $result['directory']))->toContain('azkar/hadeethenc')
        ->and(config('azkar.hadeethenc.snapshot_sha256'))->not->toBe('');
});

it('registers duas:snapshot hadeethenc', function (): void {
    expect(app(Kernel::class)->all())->toHaveKey('duas:snapshot');
});

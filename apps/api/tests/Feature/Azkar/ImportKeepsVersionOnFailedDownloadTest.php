<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/*
| M3 (2 Nov 2026): a failed OpenDua download must not fail a deploy or a start, and must not change anything. The start
| script warns and serves the current version (tests/Feature/Deploy/StartupConfigTest.php). Here: the command fails, and
| every resource row is exactly as it was before. Placeholder data only.
*/

uses(RefreshDatabase::class);

it('a failed catalogue download writes no resource or Azkar row, so the current version keeps serving', function (): void {
    config(['azkar.opendua.retry_delay_ms' => 0]);
    Http::fake(['opendua.hdfund.org/*' => Http::response('', 500)]);

    $resourcesBefore = DB::table('resources')->orderBy('id')->get()->toJson();
    $itemsBefore = DB::table('azkar_items')->count();

    $this->artisan('azkar:import', ['--download' => true, '--defer-pack' => true, '--report' => storage_path('framework/testing/azkar-download-fail.json')])
        ->assertFailed();

    expect(DB::table('resources')->orderBy('id')->get()->toJson())->toBe($resourcesBefore)
        ->and(DB::table('azkar_items')->count())->toBe($itemsBefore);
});

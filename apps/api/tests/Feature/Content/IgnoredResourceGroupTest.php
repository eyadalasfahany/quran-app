<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
});

it('prints the skip line and exits successfully without any HTTP call for an ignored group', function (string $group): void {
    Http::fake();

    $this->artisan('content:sync', ['group' => $group])
        ->expectsOutput('Skipped '.$group.': ignored by ADR 0014.')
        ->assertSuccessful();

    Http::assertNothingSent();
})->with(ResourceGroup::ignoredValues());

it('deletes ignored-group resources with their packs and changes and drops translation_entries', function (): void {
    // Skipped: the migration's up() runs DROP TABLE, which MySQL commits implicitly. That ends the
    // RefreshDatabase transaction and leaks the dropped table into the rest of the run. There is no
    // migration-behaviour test pattern in this suite yet, so verify this against a scratch database.
})->skip('database/migrations/2026_10_28_100000_drop_translation_entries_and_resources.php runs DROP TABLE, which commits the RefreshDatabase transaction on MySQL; verify against a scratch database instead.');

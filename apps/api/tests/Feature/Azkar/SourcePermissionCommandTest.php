<?php

declare(strict_types=1);

use App\Domains\Content\Models\ContentSource;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

/*
| ADR 0031 §11: the local unlock sets the OpenDua source, and production never does.
*/

uses(RefreshDatabase::class);

afterEach(function (): void {
    app()->detectEnvironment(fn (): string => 'testing');
});

function sprStatus(): string
{
    return (string) ContentSource::query()->where('code', 'opendua')->value('permission_status')?->value;
}

it('sets the OpenDua source to the given status locally', function (): void {
    $this->artisan('azkar:source-permission', ['status' => 'granted'])->assertExitCode(0);

    expect(sprStatus())->toBe('granted');
});

it('refuses statuses outside granted, pending and denied, and changes nothing', function (): void {
    $this->artisan('azkar:source-permission', ['status' => 'not_required'])->assertExitCode(1);

    expect(sprStatus())->toBe('pending');
});

it('refuses in production and leaves the source unchanged', function (): void {
    app()->detectEnvironment(fn (): string => 'production');

    $this->artisan('azkar:source-permission', ['status' => 'granted'])
        ->expectsOutputToContain('Refused')
        ->assertExitCode(1);

    app()->detectEnvironment(fn (): string => 'testing');

    expect(sprStatus())->toBe('pending');
});

it('the database seeder never runs in production', function (): void {
    app()->detectEnvironment(fn (): string => 'production');

    expect(fn () => app(DatabaseSeeder::class)->run())
        ->toThrow(RuntimeException::class, 'must not run in production');
});

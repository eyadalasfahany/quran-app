<?php

declare(strict_types=1);

require_once __DIR__.'/Support/seerah-helpers.php';

use App\Domains\Content\Models\Resource;
use App\Domains\Seerah\Exceptions\SeerahImportException;
use App\Domains\Seerah\Exceptions\SeerahImportLockedException;
use App\Domains\Seerah\Exceptions\SeerahIntegrityException;
use App\Domains\Seerah\Import\SeerahImportResult;
use App\Domains\Seerah\Models\SeerahBook;
use App\Domains\Seerah\Models\SeerahEvent;
use App\Domains\Seerah\Models\SeerahParagraph;
use App\Domains\Seerah\Repositories\Contracts\SeerahImportRepository;
use App\Domains\Seerah\Repositories\Eloquent\EloquentSeerahImportRepository;
use App\Domains\Seerah\Services\SeerahImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\Support\SeerahFixture;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    SeerahFixture::applyConfig();
});

afterEach(function (): void {
    $this->app['env'] = 'testing';
});

/**
 * @return array<string, mixed>|null
 */
function seerahResourceRow(): ?array
{
    $row = Resource::query()->where('group', 'seerah')->first();

    return $row === null ? null : $row->toArray();
}

it('imports the fixture book, its paragraphs and its events into the seerah tables', function (): void {
    $result = seerahFixtureImport();

    $resource = Resource::query()->where('group', 'seerah')->firstOrFail();
    $book = SeerahBook::query()->where('resource_id', $resource->id)->firstOrFail();

    expect($result->status)->toBe(SeerahImportResult::IMPORTED)
        ->and($result->versionAfter)->toBe(1)
        ->and($result->counts['seerah_paragraphs'])->toBe(5)
        ->and($resource->source_key)->toBe('nur-al-yaqin')
        ->and($resource->is_active)->toBeTrue()
        ->and($resource->version)->toBe(1)
        ->and($resource->changes_floor_version)->toBe(1)
        ->and($resource->import_fingerprint)->toMatch('/^[a-f0-9]{64}$/')
        ->and($book->source_id)->toBe(DB::table('content_sources')->where('code', 'openiti')->value('id'))
        ->and($book->imported_at)->not->toBeNull()
        ->and($book->paragraphs_count)->toBe(5)
        ->and($book->events_count)->toBe(3)
        ->and(SeerahParagraph::query()->where('resource_id', $resource->id)->count())->toBe(5)
        ->and(SeerahEvent::query()->where('resource_id', $resource->id)->count())->toBe(3)
        ->and(SeerahParagraph::query()->where('resource_id', $resource->id)->where('id', 1)->value('text_ar'))
        ->toBe(SeerahFixture::PARAGRAPHS['p00001']);
});

it('writes nothing again when the data is unchanged (no-op, no version bump)', function (): void {
    seerahFixtureImport();
    $first = seerahResourceRow();

    $result = seerahFixtureImport();

    expect($result->status)->toBe(SeerahImportResult::UNCHANGED)
        ->and($result->versionAfter)->toBe(1)
        ->and(seerahResourceRow()['version'])->toBe(1)
        ->and(seerahResourceRow()['import_fingerprint'])->toBe($first['import_fingerprint'])
        ->and(SeerahEvent::query()->count())->toBe(3);
});

it('bumps the version and replaces the rows when the data changes', function (): void {
    seerahFixtureImport();

    $result = seerahFixtureImport(change: function (array $files): array {
        $files['milestones.json']['milestones'][0]['label_ar'] = 'علامة تجريبية أخرى';

        return $files;
    });

    $resource = Resource::query()->where('group', 'seerah')->firstOrFail();

    expect($result->status)->toBe(SeerahImportResult::IMPORTED)
        ->and($result->versionBefore)->toBe(1)
        ->and($result->versionAfter)->toBe(2)
        ->and($resource->version)->toBe(2)
        ->and($resource->changes_floor_version)->toBe(2)
        ->and(DB::table('seerah_milestones')->where('resource_id', $resource->id)->value('label_ar'))->toBe('علامة تجريبية أخرى')
        ->and(SeerahEvent::query()->where('resource_id', $resource->id)->count())->toBe(3);
});

it('refuses data that does not validate and writes nothing', function (): void {
    $result = seerahFixtureImport(change: function (array $files): array {
        unset($files['events/E2.json']);

        return $files;
    });

    expect($result->status)->toBe(SeerahImportResult::REFUSED)
        ->and($result->issues)->not->toBeEmpty()
        ->and(seerahResourceRow())->toBeNull()
        ->and(SeerahBook::query()->count())->toBe(0)
        ->and(SeerahParagraph::query()->count())->toBe(0);
});

it('rolls the whole import back when a stored paragraph differs from the canonical text', function (): void {
    $this->app->instance(SeerahImportRepository::class, new SeerahCorruptingImportRepository(new EloquentSeerahImportRepository));

    expect(fn () => seerahFixtureImport())->toThrow(SeerahIntegrityException::class, 'The stored paragraphs differ from the canonical text: 1 mismatch(es)');

    expect(seerahResourceRow())->toBeNull()
        ->and(SeerahBook::query()->count())->toBe(0)
        ->and(SeerahParagraph::query()->count())->toBe(0)
        ->and(SeerahEvent::query()->count())->toBe(0);
});

it('refuses to run while another import holds the lock', function (): void {
    $lock = Cache::lock(SeerahImporter::LOCK_KEY, 60);
    expect($lock->get())->toBeTrue();

    try {
        expect(fn () => seerahFixtureImport())->toThrow(SeerahImportLockedException::class);
    } finally {
        $lock->release();
    }

    expect(SeerahBook::query()->count())->toBe(0);
});

it('refuses a structure import in production before it reads the data', function (): void {
    expect(fn () => seerahFixtureImport(production: true))
        ->toThrow(SeerahImportException::class, 'Production imports need --release.');

    expect(SeerahBook::query()->count())->toBe(0);
});

it('refuses a release import in production while the records are drafts', function (): void {
    $result = seerahFixtureImport(release: true, production: true);

    expect($result->status)->toBe(SeerahImportResult::REFUSED)
        ->and(SeerahBook::query()->count())->toBe(0);
});

it('refuses the command in production without --release', function (): void {
    $this->app['env'] = 'production';

    $this->artisan('seerah:import', ['--structure' => true, '--defer-pack' => true])
        ->expectsOutputToContain('Production imports need --release.')
        ->assertExitCode(1);

    expect(SeerahBook::query()->count())->toBe(0);
});

it('asks for one mode outside production', function (): void {
    $this->artisan('seerah:import', ['--defer-pack' => true])
        ->expectsOutputToContain('Choose one mode')
        ->assertExitCode(1);
});

it('imports the committed data folder with the structure mode (local only)', function (): void {
    // beforeEach swaps in the fixture batches and counts; the committed folder needs the real configuration.
    config(['seerah' => require config_path('seerah.php')]);

    $this->artisan('seerah:import', ['--structure' => true, '--defer-pack' => true])
        ->expectsOutputToContain('seerah:import imported')
        ->assertExitCode(0);

    $book = SeerahBook::query()->firstOrFail();

    expect($book->sections_count)->toBe(258)
        ->and($book->paragraphs_count)->toBe(1087)
        ->and($book->places_count)->toBe(81)
        ->and($book->events_count)->toBe(211)
        ->and($book->slug)->toBe('nur-al-yaqin');
});

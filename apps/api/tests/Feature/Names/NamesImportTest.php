<?php

declare(strict_types=1);

use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Name;
use App\Domains\Content\Models\NamesList;
use App\Domains\Content\Models\NamesVerse;
use App\Domains\Names\Data\ImportReport;
use App\Domains\Names\Services\NamesImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function grantNamesSource(): void
{
    ContentSource::query()
        ->where('code', 'names-tirmidhi')
        ->update(['permission_status' => 'granted']);
}

function namesFixturePath(): string
{
    $directory = storage_path('framework/testing/names-import');

    if (! is_dir($directory)) {
        mkdir($directory, 0777, true);
    }

    $path = $directory.DIRECTORY_SEPARATOR.'tirmidhi-fixture.json';

    $names = [];

    for ($position = 1; $position <= 99; $position++) {
        $names[] = [
            'position' => $position,
            'name_slug' => 'fixture-name-'.str_pad((string) $position, 2, '0', STR_PAD_LEFT),
            'name_ar' => '[الاسم] FIXTURE name '.$position.' — not a name',
        ];
    }

    $payload = [
        'schema_version' => 1,
        'list_slug' => 'tirmidhi',
        'source_version' => 'fixture-1',
        'list' => [
            'title_ar' => '[عنوان القائمة — نص تجريبي]',
            'source_label_ar' => '[القائمة: … — نص تجريبي]',
            'attribution_ar' => null,
            'attribution_en' => null,
            'edition_reference' => 'fixture edition reference',
        ],
        'names' => $names,
    ];

    file_put_contents($path, json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    return $path;
}

it('refuses names:import while the content source is pending', function (): void {
    $report = app(NamesImporter::class)->run(namesFixturePath());

    expect($report->status)->toBe(ImportReport::STATUS_REFUSED);
});

it('imports a granted fixture file with placeholder names only', function (): void {
    grantNamesSource();

    $path = namesFixturePath();
    $report = app(NamesImporter::class)->run($path);

    expect($report->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($report->content['names'] ?? null)->toBe(99);

    $resourceId = $report->content['resource_id'] ?? null;
    expect($resourceId)->toBeInt();

    expect(NamesList::query()->where('resource_id', $resourceId)->count())->toBe(1)
        ->and(Name::query()->where('resource_id', $resourceId)->count())->toBe(99)
        ->and(NamesVerse::query()->where('resource_id', $resourceId)->count())->toBe(0);

    $sample = Name::query()->where('resource_id', $resourceId)->orderBy('position')->value('name_ar');
    expect($sample)->toContain('FIXTURE')
        ->and($sample)->toContain('not a name');
});

it('validates the committed tirmidhi shell as invalid until 99 names are added', function (): void {
    grantNamesSource();

    $path = database_path('data/names/tirmidhi.json');
    $report = app(NamesImporter::class)->run($path);

    expect($report->status)->toBe(ImportReport::STATUS_INVALID)
        ->and(collect($report->content['issues'] ?? [])->pluck('code'))->toContain('names_count');
});

it('refuses the artisan command when the source is pending', function (): void {
    $this->artisan('names:import', ['path' => namesFixturePath()])
        ->assertFailed();
});

it('accepts dry-run on a granted fixture without writing rows', function (): void {
    grantNamesSource();

    $path = namesFixturePath();

    $this->artisan('names:import', ['path' => $path, '--dry-run' => true])
        ->assertSuccessful();

    expect(Name::query()->count())->toBe(0);
});

<?php

declare(strict_types=1);

use App\Domains\Duas\Services\HadeethEncDuasGroupBuilder;
use App\Support\Storage\SourceCache;
use Illuminate\Support\Facades\File;

const DUAS_GROUP_DATE = '2099-02-02';

afterEach(function (): void {
    File::deleteDirectory(SourceCache::path('duas/hadeethenc/'.DUAS_GROUP_DATE));
});

it('maps hadith ids to the first category list that mentions them', function (): void {
    $directory = SourceCache::path('duas/hadeethenc/'.DUAS_GROUP_DATE);
    File::ensureDirectoryExists($directory);

    File::put($directory.'/categories.json', json_encode([
        ['id' => '301', 'title' => 'FIXTURE cat A', 'parent_id' => null],
        ['id' => '302', 'title' => 'FIXTURE cat B', 'parent_id' => null],
    ], JSON_THROW_ON_ERROR));

    File::put($directory.'/list-301-1.json', json_encode([
        'data' => [['id' => '10'], ['id' => '11']],
        'meta' => ['last_page' => 1],
    ], JSON_THROW_ON_ERROR));

    File::put($directory.'/list-302-1.json', json_encode([
        'data' => [['id' => '11'], ['id' => '12']],
        'meta' => ['last_page' => 1],
    ], JSON_THROW_ON_ERROR));

    File::put($directory.'/manifest.json', json_encode([
        'categories' => [301, 302],
    ], JSON_THROW_ON_ERROR));

    $built = app(HadeethEncDuasGroupBuilder::class)->build($directory);

    expect($built['groups'])->toHaveCount(2)
        ->and($built['groups'][0]['title'])->toBe('FIXTURE cat A')
        ->and($built['hadithPrimaryGroup'][10])->toBe(1)
        ->and($built['hadithPrimaryGroup'][11])->toBe(1)
        ->and($built['hadithPrimaryGroup'][12])->toBe(2);
});

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

beforeEach(function (): void {
    config(['duas.hadeethenc.hidden_category_ids' => [], 'duas.hadeethenc.excluded_hadith_ids' => []]);
});

/**
 * @param  array<string, list<int>>  $listsByCategory  Hadith ids per category, written as one list page each.
 */
function duasGroupFixtureDirectory(array $titlesByCategory, array $listsByCategory): string
{
    $directory = SourceCache::path('duas/hadeethenc/'.DUAS_GROUP_DATE);
    File::ensureDirectoryExists($directory);

    $categories = [];

    foreach ($titlesByCategory as $categoryId => $title) {
        $categories[] = ['id' => (string) $categoryId, 'title' => $title, 'parent_id' => null];
    }

    File::put($directory.'/categories.json', json_encode($categories, JSON_THROW_ON_ERROR));

    foreach ($listsByCategory as $categoryId => $hadithIds) {
        File::put($directory.'/list-'.$categoryId.'-1.json', json_encode([
            'data' => array_map(fn (int $id): array => ['id' => (string) $id], $hadithIds),
            'meta' => ['last_page' => 1],
        ], JSON_THROW_ON_ERROR));
    }

    File::put($directory.'/manifest.json', json_encode([
        'categories' => array_keys($titlesByCategory),
    ], JSON_THROW_ON_ERROR));

    return $directory;
}

it('produces no group for a hidden category and keeps the id the next shown category would have had', function (): void {
    $directory = duasGroupFixtureDirectory(
        [301 => 'FIXTURE cat hidden', 302 => 'FIXTURE cat shown'],
        [301 => [10], 302 => [12]],
    );

    config(['duas.hadeethenc.hidden_category_ids' => [301]]);

    $built = app(HadeethEncDuasGroupBuilder::class)->build($directory);

    expect($built['groups'])->toHaveCount(1)
        ->and($built['groups'][0]['id'])->toBe(2)
        ->and($built['groups'][0]['title'])->toBe('FIXTURE cat shown')
        ->and($built['groups'][0]['position'])->toBe(1)
        ->and($built['hadithPrimaryGroup'])->not->toHaveKey(10)
        ->and($built['hadithPrimaryGroup'][12])->toBe(2);
});

it('gives a hadith listed in a hidden and a shown category the shown group as primary', function (): void {
    $directory = duasGroupFixtureDirectory(
        [301 => 'FIXTURE cat hidden', 302 => 'FIXTURE cat shown'],
        [301 => [11], 302 => [11]],
    );

    config(['duas.hadeethenc.hidden_category_ids' => [301]]);

    $built = app(HadeethEncDuasGroupBuilder::class)->build($directory);

    expect($built['hadithPrimaryGroup'][11])->toBe(2);
});

it('gives a hadith only in hidden categories no primary group', function (): void {
    $directory = duasGroupFixtureDirectory(
        [301 => 'FIXTURE cat hidden', 302 => 'FIXTURE cat shown'],
        [301 => [10], 302 => []],
    );

    config(['duas.hadeethenc.hidden_category_ids' => [301]]);

    $built = app(HadeethEncDuasGroupBuilder::class)->build($directory);

    expect($built['groups'])->toHaveCount(1)
        ->and($built['hadithPrimaryGroup'])->not->toHaveKey(10);
});

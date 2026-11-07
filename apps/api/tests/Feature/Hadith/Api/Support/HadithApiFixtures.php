<?php

declare(strict_types=1);

use App\Domains\Content\Models\ContentPack;
use App\Domains\Hadith\Models\HadithBook;
use App\Domains\Hadith\Models\HadithChapter;
use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Models\HadithEntry;
use Database\Factories\HadithBookFactory;
use Database\Factories\HadithChapterFactory;
use Database\Factories\HadithCollectionFactory;
use Database\Factories\HadithEntryFactory;
use Illuminate\Support\Facades\Storage;

/**
 * Creates a collection with canonical slug. It is not served until hadithApiServe() runs.
 *
 * @param  array<string, mixed>  $state
 */
function hadithApiCollection(string $slug = 'bukhari', array $state = []): HadithCollection
{
    return HadithCollectionFactory::new()->state([...$state, 'slug' => $slug])->create();
}

/**
 * Makes a collection served: a pack row for its resource and a pack file on the fake local disk.
 */
function hadithApiServe(HadithCollection $collection): HadithCollection
{
    $path = 'packs/hadith-fixture-'.$collection->resource_id.'.sqlite.gz';

    ContentPack::query()->create([
        'resource_id' => $collection->resource_id,
        'version' => 1,
        'path' => $path,
        'size_bytes' => 1,
        'sha256' => str_repeat('a', 64),
        'row_count' => 1,
        'schema_version' => 1,
        'built_at' => now(),
    ]);

    Storage::disk('local')->put($path, 'x');

    return $collection;
}

/**
 * @param  array<string, mixed>  $state
 */
function hadithApiBook(HadithCollection $collection, int $position, string $number, array $state = []): HadithBook
{
    return HadithBookFactory::new()->state([
        ...$state,
        'resource_id' => $collection->resource_id,
        'position' => $position,
        'book_number' => $number,
    ])->create();
}

/**
 * @param  array<string, mixed>  $state
 */
function hadithApiChapter(HadithCollection $collection, HadithBook $book, int $position, int $number, array $state = []): HadithChapter
{
    return HadithChapterFactory::new()->state([
        ...$state,
        'resource_id' => $collection->resource_id,
        'book_id' => $book->id,
        'position' => $position,
        'chapter_number' => $number,
    ])->create();
}

/**
 * @param  array<string, mixed>  $state
 */
function hadithApiEntry(HadithCollection $collection, HadithBook $book, int $position, string $number, array $state = []): HadithEntry
{
    return HadithEntryFactory::new()->state([
        ...$state,
        'resource_id' => $collection->resource_id,
        'book_id' => $book->id,
        'position' => $position,
        'hadith_number' => $number,
    ])->create();
}

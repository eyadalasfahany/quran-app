<?php

declare(strict_types=1);

use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Hadith\Enums\HadithAliasMatch;
use App\Domains\Hadith\Models\HadithBook;
use App\Domains\Hadith\Models\HadithChapter;
use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Models\HadithGrade;
use App\Domains\Hadith\Models\HadithRefAlias;
use Carbon\CarbonImmutable;
use Database\Factories\HadithCollectionFactory;
use Database\Factories\HadithEntryFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a valid row from every hadith factory', function (): void {
    expect(HadithCollection::factory()->create())->toBeInstanceOf(HadithCollection::class)
        ->and(HadithBook::factory()->create())->toBeInstanceOf(HadithBook::class)
        ->and(HadithChapter::factory()->create())->toBeInstanceOf(HadithChapter::class)
        ->and(HadithEntry::factory()->create())->toBeInstanceOf(HadithEntry::class)
        ->and(HadithGrade::factory()->create())->toBeInstanceOf(HadithGrade::class)
        ->and(HadithRefAlias::factory()->create())->toBeInstanceOf(HadithRefAlias::class);
});

it('casts integers, dates and the alias match', function (): void {
    $entry = HadithEntry::factory()->create();

    $stored = HadithEntry::query()
        ->where('resource_id', $entry->resource_id)
        ->where('id', $entry->id)
        ->firstOrFail();

    $alias = HadithRefAlias::factory()->ofMatch(HadithAliasMatch::NumberOnly)->create();

    $storedAlias = HadithRefAlias::query()
        ->where('resource_id', $alias->resource_id)
        ->where('old_number', $alias->old_number)
        ->where('since_version', 1)
        ->firstOrFail();

    expect($stored->id)->toBeInt()
        ->and($stored->book_id)->toBeInt()
        ->and($stored->imported_at)->toBeInstanceOf(CarbonImmutable::class)
        ->and($stored->hadith_number)->toBeString()
        ->and($storedAlias->match)->toBe(HadithAliasMatch::NumberOnly);
});

it('resolves the resource and the source relations', function (): void {
    $entry = HadithEntry::query()
        ->where('resource_id', HadithEntry::factory()->create()->resource_id)
        ->firstOrFail();

    expect($entry->source?->code)->toBe('fawazahmed0')
        ->and($entry->resource())->toBeInstanceOf(BelongsTo::class)
        ->and($entry->resource()->getRelated())->toBeInstanceOf(Resource::class)
        ->and($entry->source()->getRelated())->toBeInstanceOf(ContentSource::class)
        ->and(method_exists(HadithRefAlias::class, 'source'))->toBeFalse()
        ->and(method_exists(HadithRefAlias::class, 'resource'))->toBeTrue();
});

it('builds the untitled and arabic states', function (): void {
    $collection = HadithCollection::factory()->untitled()->create();
    $book = HadithBook::factory()->sectionZero()->create();
    $entry = HadithEntry::factory()->withBidiMark()->create();

    expect($collection->title_ar)->toBeNull()
        ->and($book->book_number)->toBe('0')
        ->and($entry->source_text_sha256)->toBe(hash('sha256', (string) $entry->text_ar));
});

it('uses only placeholder text in the factories', function (): void {
    $rows = [
        HadithCollection::factory()->create()->getAttributes(),
        HadithBook::factory()->create()->getAttributes(),
        HadithChapter::factory()->create()->getAttributes(),
        HadithEntry::factory()->arabic()->create()->getAttributes(),
        HadithGrade::factory()->create()->getAttributes(),
    ];

    $allowedArabic = [HadithCollectionFactory::ARABIC_TITLE, HadithEntryFactory::ARABIC_TEXT];
    $latinProse = ['title_en', 'author_en', 'attribution_en', 'grade', 'graded_by'];

    foreach ($rows as $row) {
        foreach ($row as $column => $value) {
            if (! is_string($value)) {
                continue;
            }

            if (preg_match('/\p{Arabic}/u', $value) === 1) {
                expect($value)->toBeIn($allowedArabic);
            }

            if (in_array($column, $latinProse, true)) {
                expect(str_starts_with($value, 'FIXTURE'))->toBeTrue();
            }
        }
    }
});

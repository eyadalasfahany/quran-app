<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahBook;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder book rows (ADR 0089). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahBook>
 */
class SeerahBookFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahBook::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $n = self::$nextId++;

        return [
            'resource_id' => fn (): int => $this->seerahResourceId(),
            'id' => 1,
            'source_id' => fn (): int => $this->seerahSourceId(),
            'imported_at' => now(),
            'slug' => 'fixture-seerah-book-'.$n,
            'title_ar' => 'عنوان تجريبي — ليس الكتاب',
            'author_ar' => 'FIXTURE author — not the book author',
            'edition_ar' => 'FIXTURE edition',
            'attribution_ar' => 'FIXTURE attribution',
            'attribution_en' => 'FIXTURE attribution',
            'source_version' => 'FIXTURE-version',
            'source_sha256' => str_repeat('a', 64),
            'canonical_sha256' => str_repeat('b', 64),
            'sections_count' => 1,
            'paragraphs_count' => 1,
            'places_count' => 1,
            'events_count' => 1,
            'routes_count' => 0,
        ];
    }
}

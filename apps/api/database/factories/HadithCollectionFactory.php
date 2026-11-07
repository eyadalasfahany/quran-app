<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Hadith\Models\HadithCollection;
use Database\Factories\Concerns\CreatesHadithResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HadithCollection>
 */
class HadithCollectionFactory extends Factory
{
    use CreatesHadithResource;

    public const string ARABIC_TITLE = 'عنوان تجريبي — ليس عنوانًا';

    protected $model = HadithCollection::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $number = self::$nextId++;

        return [
            'resource_id' => fn (array $attributes): int => $this->hadithResourceId((string) $attributes['slug']),
            'id' => $number,
            'slug' => fake()->unique()->numerify('fixture-####'),
            'source_id' => fn (): int => $this->hadithSourceId(),
            'source_code' => 'fawazahmed0',
            'title_ar' => self::ARABIC_TITLE,
            'title_en' => 'FIXTURE title',
            'author_ar' => 'FIXTURE author',
            'author_en' => 'FIXTURE author',
            'attribution_ar' => 'FIXTURE attribution',
            'attribution_en' => 'FIXTURE attribution',
            'source_url' => null,
            'total_hadith' => 1,
            'books_count' => 1,
            'is_complete' => true,
            'incomplete_count' => 0,
            'unavailable_count' => 0,
            'source_version' => (string) config('hadith.commit'),
            'imported_at' => now(),
        ];
    }

    public function untitled(): static
    {
        return $this->state(fn (): array => [
            'title_ar' => null,
            'title_en' => null,
            'author_ar' => null,
            'author_en' => null,
        ]);
    }

    public function incomplete(int $count = 1): static
    {
        return $this->state(fn (): array => ['is_complete' => false, 'incomplete_count' => $count]);
    }

    public function arabicTitled(): static
    {
        return $this->state(fn (): array => ['title_ar' => self::ARABIC_TITLE]);
    }
}

<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Hadith\Models\HadithBook;
use Database\Factories\Concerns\CreatesHadithResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HadithBook>
 */
class HadithBookFactory extends Factory
{
    use CreatesHadithResource;

    protected $model = HadithBook::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $number = self::$nextId++;

        return [
            'resource_id' => fn (): int => $this->hadithResourceId(),
            'id' => $number,
            'book_number' => (string) fake()->unique()->numberBetween(1, 99999),
            'title_ar' => HadithCollectionFactory::ARABIC_TITLE,
            'title_en' => 'FIXTURE title — not a hadith',
            'position' => 1,
            'hadith_count' => 1,
            'source_id' => fn (): int => $this->hadithSourceId(),
            'source_key' => 'fawazahmed0:fixture:book:'.$number,
        ];
    }

    public function untitled(): static
    {
        return $this->state(fn (): array => [
            'title_ar' => null,
            'title_en' => null,
        ]);
    }

    public function sectionZero(): static
    {
        return $this->state(fn (): array => [
            'book_number' => '0',
            'title_ar' => null,
            'title_en' => null,
        ]);
    }
}

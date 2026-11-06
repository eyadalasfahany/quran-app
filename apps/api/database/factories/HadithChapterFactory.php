<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Hadith\Models\HadithChapter;
use Database\Factories\Concerns\CreatesHadithResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HadithChapter>
 */
class HadithChapterFactory extends Factory
{
    use CreatesHadithResource;

    protected $model = HadithChapter::class;

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
            'book_id' => 1,
            'chapter_number' => 1,
            'source_chapter_key' => null,
            'title_ar' => HadithCollectionFactory::ARABIC_TITLE,
            'title_en' => 'FIXTURE title — not a hadith',
            'position' => 1,
            'hadith_count' => 1,
            'source_id' => fn (): int => $this->hadithSourceId(),
            'source_key' => 'sunnahcom:fixture:chapter:'.$number,
        ];
    }

    public function withChapterKey(string $key = '1.5'): static
    {
        return $this->state(fn (): array => ['source_chapter_key' => $key]);
    }
}

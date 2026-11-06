<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Hadith\Models\HadithEntry;
use Database\Factories\Concerns\CreatesHadithResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HadithEntry>
 */
class HadithEntryFactory extends Factory
{
    use CreatesHadithResource;

    public const string LATIN_TEXT = 'FIXTURE text 1 — not a hadith';

    public const string BIDI_TEXT = "FIXTURE text 1 — not a hadith \u{200F}";

    public const string ARABIC_TEXT = 'نص تجريبي ١ — ليس حديثًا';

    protected $model = HadithEntry::class;

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
            'chapter_id' => null,
            'hadith_number' => (string) $number,
            'arabic_number' => null,
            'position' => 1,
            'text_ar' => self::LATIN_TEXT,
            'text_en' => null,
            'narrator_en' => null,
            'text_search' => 'fixture text 1 not a hadith',
            'source_url' => null,
            'source_id' => fn (): int => $this->hadithSourceId(),
            'source_key' => 'fawazahmed0:fixture:'.$number,
            'source_text_sha256' => hash('sha256', self::LATIN_TEXT),
            'source_version' => (string) config('hadith.commit'),
            'imported_at' => now(),
        ];
    }

    public function inChapter(int $chapterId): static
    {
        return $this->state(fn (): array => ['chapter_id' => $chapterId]);
    }

    public function decimalNumber(): static
    {
        return $this->state(fn (): array => [
            'hadith_number' => '2787.2',
            'arabic_number' => '2787.2',
        ]);
    }

    public function withBidiMark(): static
    {
        return $this->state(fn (): array => [
            'text_ar' => self::BIDI_TEXT,
            'source_text_sha256' => hash('sha256', self::BIDI_TEXT),
        ]);
    }

    public function arabic(): static
    {
        return $this->state(fn (): array => [
            'text_ar' => self::ARABIC_TEXT,
            'source_text_sha256' => hash('sha256', self::ARABIC_TEXT),
        ]);
    }
}

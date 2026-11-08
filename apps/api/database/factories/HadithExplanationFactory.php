<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Hadith\Models\HadithExplanation;
use Database\Factories\Concerns\CreatesHadithExplanationResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HadithExplanation>
 */
class HadithExplanationFactory extends Factory
{
    use CreatesHadithExplanationResource;

    public const string BODY = 'FIXTURE explanation 1 — not an explanation';

    protected $model = HadithExplanation::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $id = self::$nextId++;

        return [
            'resource_id' => fn (): int => $this->hadithExplanationResourceId(),
            'id' => $id,
            'source_id' => fn (): int => $this->hadithExplanationSourceId(),
            'source_key' => (string) $id,
            'title_ar' => 'نص تجريبي ١ — ليس شرحًا',
            'attribution_ar' => 'FIXTURE attribution — not an explanation',
            'reference_ar' => 'FIXTURE reference — not an explanation',
            'body_ar' => self::BODY,
            'benefits_ar' => '["FIXTURE benefit — not an explanation"]',
            'words_ar' => null,
            'intro_ar' => null,
            'grade_ar' => 'FIXTURE grade — not an explanation',
            'source_url' => 'https://hadeethenc.com/ar/browse/hadith/'.$id,
            'source_sha256' => hash('sha256', (string) $id),
            'source_version' => '2001-01-01',
            'imported_at' => now(),
        ];
    }
}

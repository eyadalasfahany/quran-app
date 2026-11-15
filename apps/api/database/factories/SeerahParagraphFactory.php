<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahParagraph;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder paragraph rows (ADR 0091). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahParagraph>
 */
class SeerahParagraphFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahParagraph::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $n = self::$nextId++;

        return [
            'resource_id' => fn (): int => $this->seerahResourceId(),
            'id' => $n,
            'code' => sprintf('p%05d', $n),
            'section_id' => 1,
            'position' => $n,
            'page' => 1,
            'text_ar' => 'نص تجريبي — ليس من الكتاب',
            'text_sha256' => hash('sha256', 'نص تجريبي — ليس من الكتاب'),
        ];
    }
}

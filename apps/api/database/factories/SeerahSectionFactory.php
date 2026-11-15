<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahSection;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder section rows (ADR 0091). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahSection>
 */
class SeerahSectionFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahSection::class;

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
            'code' => sprintf('s%03d', $n),
            'level' => 'heading',
            'title_ar' => 'عنوان تجريبي — ليس عنوانًا',
            'page' => 1,
            'position' => $n,
            'paragraph_from' => null,
            'paragraph_to' => null,
        ];
    }
}

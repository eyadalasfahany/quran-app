<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahEvent;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder event rows (ADR 0089). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahEvent>
 */
class SeerahEventFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahEvent::class;

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
            'slug' => sprintf('e%03d', $n),
            'position' => $n,
            'section_id' => 1,
            'paragraph_from' => null,
            'paragraph_to' => null,
            'title_ar' => 'عنوان تجريبي — ليس عنوانًا',
            'kind' => 'event',
            'place_id' => 1,
            'place_basis' => 'stated',
            'also' => '[]',
            'age_from' => 53,
            'age_to' => 53,
            'era' => 'ah',
            'hijri_from' => 1,
            'hijri_to' => 1,
            'year_basis' => 'stated_age',
            'certainty' => 'stated',
            'route_id' => null,
            'flags' => '[]',
        ];
    }
}

<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahEventEvidence;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder evidence quote rows (ADR 0091). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahEventEvidence>
 */
class SeerahEventEvidenceFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahEventEvidence::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resource_id' => fn (): int => $this->seerahResourceId(),
            'event_id' => 1,
            'kind' => 'place',
            'position' => 1,
            'paragraph_id' => 1,
            'quote_ar' => 'اقتباس تجريبي — ليس من الكتاب',
        ];
    }
}

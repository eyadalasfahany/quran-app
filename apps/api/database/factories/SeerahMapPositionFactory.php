<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahMapPosition;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder map position rows (ADR 0091). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahMapPosition>
 */
class SeerahMapPositionFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahMapPosition::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resource_id' => fn (): int => $this->seerahResourceId(),
            'level' => 'fixture-level',
            'place_id' => 1,
            'x' => 500.0,
            'y' => 500.0,
            'label_priority' => 50,
            'label_side' => 'end',
            'art_landmark' => false,
        ];
    }
}

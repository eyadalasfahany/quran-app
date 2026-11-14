<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahRouteStop;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder route stop rows (ADR 0089). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahRouteStop>
 */
class SeerahRouteStopFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahRouteStop::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resource_id' => fn (): int => $this->seerahResourceId(),
            'route_id' => 1,
            'position' => 1,
            'place_id' => 1,
        ];
    }
}

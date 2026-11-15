<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahMapRoutePath;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder route path rows (ADR 0091). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahMapRoutePath>
 */
class SeerahMapRoutePathFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahMapRoutePath::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resource_id' => fn (): int => $this->seerahResourceId(),
            'level' => 'fixture-level',
            'route_id' => 1,
            'from_place_id' => 1,
            'to_place_id' => 2,
            'path_d' => 'M 0 0 L 1 1',
        ];
    }
}

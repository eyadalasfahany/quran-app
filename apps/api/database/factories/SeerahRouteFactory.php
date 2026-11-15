<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahRoute;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder route rows (ADR 0091). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahRoute>
 */
class SeerahRouteFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahRoute::class;

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
            'slug' => 'fixture-route-'.$n,
            'kind' => 'trip',
            'name_ar' => 'مسار تجريبي',
        ];
    }
}

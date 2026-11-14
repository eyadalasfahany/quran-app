<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahPlace;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder place rows (ADR 0089). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahPlace>
 */
class SeerahPlaceFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahPlace::class;

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
            'slug' => 'fixture-place-'.$n,
            'parent_id' => null,
            'kind' => 'region',
            'name_ar' => 'مكان تجريبي',
            'lat' => null,
            'lng' => null,
            'geo_precision' => null,
            'geo_source' => null,
            'flags' => '[]',
        ];
    }
}

<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahMapLevel;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder map level rows (ADR 0089). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahMapLevel>
 */
class SeerahMapLevelFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahMapLevel::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $n = self::$nextId++;

        return [
            'resource_id' => fn (): int => $this->seerahResourceId(),
            'level' => 'fixture-level-'.$n,
            'parent_place_id' => 1,
            'viewbox' => '0 0 1000 1000',
            'art' => 'design-assets/seerah/FIXTURE.svg',
        ];
    }
}

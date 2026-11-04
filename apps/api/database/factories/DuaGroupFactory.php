<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Duas\Models\DuaGroup;
use Database\Factories\Concerns\CreatesDuasResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DuaGroup>
 */
class DuaGroupFactory extends Factory
{
    use CreatesDuasResource;

    protected $model = DuaGroup::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resource_id' => fn (): int => $this->duasResourceId(),
            'id' => self::$nextId++,
            'source_category_id' => fake()->numberBetween(301, 313),
            'title' => 'FIXTURE group title — not a dua',
            'position' => fake()->numberBetween(1, 20),
        ];
    }
}

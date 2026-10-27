<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Models\Resource;
use Illuminate\Database\Eloquent\Factories\Attributes\UseModel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Mushaf>
 */
#[UseModel(Mushaf::class)]
class MushafFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => fake()->unique()->numberBetween(1, 20_000),
            'resource_id' => Resource::factory()->state([
                'group' => ResourceGroup::Mushafs,
            ]),
            'name' => 'Madani',
            'pages_count' => 604,
            'lines_per_page' => 15,
        ];
    }
}

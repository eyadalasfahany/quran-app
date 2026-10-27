<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Models\WordLayout;
use Illuminate\Database\Eloquent\Factories\Attributes\UseModel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WordLayout>
 */
#[UseModel(WordLayout::class)]
class WordLayoutFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mushaf_id' => Mushaf::factory(),
            'word_id' => fake()->unique()->numberBetween(1, 1_000_000_000),
            'verse_id' => 1,
            'position_in_verse' => 1,
            'char_type' => 'word',
            'glyph' => 'word',
            'page' => 1,
            'line' => 1,
            'position_in_line' => 1,
        ];
    }
}

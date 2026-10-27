<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\TranslationEntry;
use Illuminate\Database\Eloquent\Factories\Attributes\UseModel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TranslationEntry>
 */
#[UseModel(TranslationEntry::class)]
class TranslationEntryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resource_id' => Resource::factory(),
            'verse_id' => fake()->unique()->numberBetween(1, 6236),
            'verse_key' => '1:1',
            'text' => 'text',
            'footnotes' => null,
            'source_record_id' => null,
        ];
    }
}

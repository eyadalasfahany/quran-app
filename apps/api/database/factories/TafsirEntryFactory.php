<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\TafsirEntry;
use Illuminate\Database\Eloquent\Factories\Attributes\UseModel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TafsirEntry>
 */
#[UseModel(TafsirEntry::class)]
class TafsirEntryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resource_id' => Resource::factory()->state([
                'group' => ResourceGroup::Tafsirs,
            ]),
            'group_tafsir_id' => fake()->unique()->numberBetween(1, 1_000_000_000),
            'first_verse_id' => 1,
            'last_verse_id' => 1,
            'first_verse_key' => '1:1',
            'last_verse_key' => '1:1',
            'html' => '<p>tafsir</p>',
            'source_hash' => str_repeat('ab', 32),
        ];
    }
}

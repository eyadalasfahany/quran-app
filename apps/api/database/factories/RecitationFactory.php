<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\Resource;
use Illuminate\Database\Eloquent\Factories\Attributes\UseModel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Recitation>
 */
#[UseModel(Recitation::class)]
class RecitationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resource_id' => Resource::factory()->state([
                'group' => ResourceGroup::ChapterRecitations,
            ]),
            'reciter_name' => fake()->name(),
            'reciter_name_ar' => 'قارئ',
            'style' => 'murattal',
            'qirat' => 'hafs',
            'has_word_segments' => false,
        ];
    }
}

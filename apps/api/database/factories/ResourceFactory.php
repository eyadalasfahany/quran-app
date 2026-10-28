<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Enums\TextDirection;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use Illuminate\Database\Eloquent\Factories\Attributes\UseModel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Domains\Content\Models\Resource>
 */
#[UseModel(Resource::class)]
class ResourceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'source_id' => function (array $attributes): int {
                $source = ContentSource::query()->create([
                    'code' => fake()->unique()->lexify('????????'),
                    'name' => fake()->company(),
                    'licence_url' => 'https://example.com/licence',
                    'attribution_ar' => 'إسناد',
                    'attribution_en' => 'Attribution',
                    'permission_status' => PermissionStatus::Granted,
                ]);

                return $source->id;
            },
            'group' => ResourceGroup::Tafsirs,
            'source_key' => fake()->unique()->numerify('####'),
            'name' => fake()->words(3, true),
            'language_code' => 'ar',
            'direction' => TextDirection::Rtl,
            'is_active' => true,
        ];
    }
}

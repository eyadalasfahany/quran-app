<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\TaybahRecitationTiming;
use Illuminate\Database\Eloquent\Factories\Attributes\UseModel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaybahRecitationTiming>
 */
#[UseModel(TaybahRecitationTiming::class)]
class TaybahRecitationTimingFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'recitation_id' => Recitation::factory(),
            'chapter_id' => 1,
            'verse_id' => 1,
            'start_ms' => 0,
            'end_ms' => 1000,
            'segments' => [[1, 0, 1000]],
        ];
    }
}

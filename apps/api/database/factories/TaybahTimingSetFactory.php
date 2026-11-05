<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Content\Enums\TaybahTimingSource;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\TaybahTimingSet;
use Illuminate\Database\Eloquent\Factories\Attributes\UseModel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaybahTimingSet>
 */
#[UseModel(TaybahTimingSet::class)]
class TaybahTimingSetFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'recitation_id' => Recitation::factory(),
            'chapter_id' => 1,
            'audio_url' => 'https://audio.example.test/fixture/001.mp3',
            'size_bytes' => 1024,
            'sha256' => str_repeat('a', 64),
            'measured_duration_ms' => 60_000,
            'source' => TaybahTimingSource::Aligner,
            'tool_version' => '0.0.0-fixture',
            'models' => null,
            'original_first_start_ms' => null,
            'digest' => str_repeat('b', 64),
            'imported_at' => now(),
        ];
    }
}

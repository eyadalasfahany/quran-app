<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\Recitation;
use Illuminate\Database\Eloquent\Factories\Attributes\UseModel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChapterAudioFile>
 */
#[UseModel(ChapterAudioFile::class)]
class ChapterAudioFileFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => fake()->unique()->numberBetween(1, 1_000_000_000),
            'recitation_id' => Recitation::factory(),
            'chapter_id' => fake()->unique()->numberBetween(1, 114),
            'audio_url' => 'https://download.quranicaudio.com/example.mp3',
            'size_bytes' => 1024,
            'duration_ms' => 60_000,
            'format' => 'mp3',
        ];
    }
}

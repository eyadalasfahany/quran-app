<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Feedback\Models\Suggestion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Suggestion>
 */
class SuggestionFactory extends Factory
{
    protected $model = Suggestion::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'FIXTURE name',
            'email' => fake()->unique()->safeEmail(),
            'message' => 'FIXTURE message text 1 — not a suggestion',
            'locale' => 'en',
            'source' => 'website',
            'auto_reply_sent' => false,
        ];
    }
}

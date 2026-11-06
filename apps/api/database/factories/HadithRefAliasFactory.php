<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Hadith\Enums\HadithAliasMatch;
use App\Domains\Hadith\Models\HadithRefAlias;
use Database\Factories\Concerns\CreatesHadithResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HadithRefAlias>
 */
class HadithRefAliasFactory extends Factory
{
    use CreatesHadithResource;

    protected $model = HadithRefAlias::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $number = (string) fake()->unique()->numberBetween(1, 99999);

        return [
            'resource_id' => fn (): int => $this->hadithResourceId(),
            'old_number' => $number,
            'new_number' => $number,
            'match' => HadithAliasMatch::ExactText,
            'since_version' => 1,
        ];
    }

    public function withoutNewNumber(): static
    {
        return $this->state(fn (): array => [
            'new_number' => null,
            'match' => HadithAliasMatch::None,
        ]);
    }

    public function ofMatch(HadithAliasMatch $match): static
    {
        return $this->state(fn (): array => ['match' => $match]);
    }
}

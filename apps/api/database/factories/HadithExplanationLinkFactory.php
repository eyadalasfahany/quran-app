<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Hadith\Models\HadithExplanationLink;
use Database\Factories\Concerns\CreatesHadithExplanationResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HadithExplanationLink>
 */
class HadithExplanationLinkFactory extends Factory
{
    use CreatesHadithExplanationResource;

    protected $model = HadithExplanationLink::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resource_id' => fn (): int => $this->hadithExplanationResourceId(),
            'collection_slug' => 'bukhari',
            'hadith_number' => '1',
            'explanation_id' => 1,
            'status' => 'accepted',
            'evidence' => 'containment:0.80;gap:0.20',
        ];
    }
}

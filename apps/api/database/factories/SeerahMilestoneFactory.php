<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Seerah\Models\SeerahMilestone;
use Database\Factories\Concerns\CreatesSeerahResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Placeholder milestone rows (ADR 0089). Text is marked «FIXTURE» or «تجريبي»; no book text.
 *
 * @extends Factory<SeerahMilestone>
 */
class SeerahMilestoneFactory extends Factory
{
    use CreatesSeerahResource;

    protected $model = SeerahMilestone::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $n = self::$nextId++;

        return [
            'resource_id' => fn (): int => $this->seerahResourceId(),
            'milestone_key' => 'fixture-milestone-'.$n,
            'label_ar' => 'علامة تجريبية',
            'event_id' => 1,
            'position' => $n,
        ];
    }
}

<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Hadith\Models\HadithGrade;
use Database\Factories\Concerns\CreatesHadithResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HadithGrade>
 */
class HadithGradeFactory extends Factory
{
    use CreatesHadithResource;

    protected $model = HadithGrade::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $number = self::$nextId++;

        return [
            'resource_id' => fn (): int => $this->hadithResourceId(),
            'id' => $number,
            'entry_id' => 1,
            'grade' => 'FIXTURE grade',
            'graded_by' => 'FIXTURE grader',
            'source_id' => fn (): int => $this->hadithSourceId(),
            'source_key' => 'fawazahmed0:fixture:grade:'.$number,
        ];
    }

    public function ungraded(): static
    {
        return $this->state(fn (): array => ['graded_by' => null]);
    }
}

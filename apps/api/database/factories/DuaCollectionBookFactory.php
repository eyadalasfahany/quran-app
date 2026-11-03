<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Duas\Models\DuaCollectionBook;
use Database\Factories\Concerns\CreatesDuasResource;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DuaCollectionBook>
 */
class DuaCollectionBookFactory extends Factory
{
    use CreatesDuasResource;

    protected $model = DuaCollectionBook::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resource_id' => fn (): int => $this->duasResourceId(),
            'id' => self::$nextId++,
            'collection_slug' => 'bukhari',
            'book_number' => '80',
            'position' => 1,
        ];
    }
}

<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Duas\Models\DuaCollectionRef;
use App\Domains\Duas\Models\DuaItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DuaCollectionRef>
 */
class DuaCollectionRefFactory extends Factory
{
    protected $model = DuaCollectionRef::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        /** @var DuaItem $item */
        $item = DuaItemFactory::new()->create();

        return [
            'resource_id' => $item->resource_id,
            'id' => self::$nextId++,
            'item_id' => $item->id,
            'collection_slug' => 'bukhari',
            'hadith_number' => '1',
            'review_status' => 'candidate',
            'evidence' => 'contains:40',
        ];
    }
}

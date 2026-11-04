<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Duas\Models\DuaItem;
use App\Domains\Duas\Models\DuaLink;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DuaLink>
 */
class DuaLinkFactory extends Factory
{
    protected $model = DuaLink::class;

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
            'hadeeth_id' => (int) $item->source_key,
            'entry_key' => 'hisn-al-muslim:entry-000001',
            'review_status' => 'candidate',
            'evidence' => 'contains:40',
        ];
    }
}

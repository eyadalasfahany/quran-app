<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Duas\Models\DuaItem;
use App\Domains\Duas\Models\DuaQuranSpan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DuaQuranSpan>
 */
class DuaQuranSpanFactory extends Factory
{
    protected $model = DuaQuranSpan::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        /** @var DuaItem $item */
        $item = DuaItemFactory::new()->quran()->create();

        return [
            'resource_id' => $item->resource_id,
            'item_id' => $item->id,
            'surah' => 1,
            'verse_from' => 1,
            'verse_to' => null,
            'review_status' => 'reviewed',
            'rule' => 'rule_vocative_rabb',
        ];
    }
}

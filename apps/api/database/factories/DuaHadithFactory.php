<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Duas\Models\DuaHadith;
use App\Domains\Duas\Models\DuaItem;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\DB;

/**
 * @extends Factory<DuaHadith>
 */
class DuaHadithFactory extends Factory
{
    protected $model = DuaHadith::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        /** @var DuaItem $item */
        $item = DuaItemFactory::new()->create();
        $sourceId = (int) DB::table('content_sources')->where('code', 'hadeethenc')->value('id');
        $body = "FIXTURE text 1 — not a dua \u{200F}";

        return [
            'resource_id' => $item->resource_id,
            'item_id' => $item->id,
            'hadeeth_id' => (int) $item->source_key,
            'title' => 'FIXTURE title — not a dua',
            'hadeeth' => $body,
            'attribution' => 'FIXTURE attribution — not a dua',
            'grade' => 'FIXTURE grade — not a dua',
            'explanation' => 'FIXTURE explanation — not a dua',
            'reference' => 'FIXTURE reference — not a dua',
            'hints' => ['FIXTURE benefit — not a dua'],
            'text_search' => 'fixture text search',
            'source_url' => 'https://hadeethenc.com/ar/browse/hadith/1',
            'source_id' => $sourceId,
            'source_key' => (string) $item->source_key,
            'source_text_sha256' => hash('sha256', $body),
            'source_version' => '2001-01-01',
            'imported_at' => now(),
        ];
    }
}

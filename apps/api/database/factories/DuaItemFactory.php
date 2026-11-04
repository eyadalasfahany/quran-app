<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Duas\Models\DuaItem;
use Database\Factories\Concerns\CreatesDuasResource;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\DB;

/**
 * @extends Factory<DuaItem>
 */
class DuaItemFactory extends Factory
{
    use CreatesDuasResource;

    protected $model = DuaItem::class;

    private static int $nextId = 1;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $key = fake()->unique()->numerify('hadith:####');

        return [
            'resource_id' => fn (): int => $this->duasResourceId(),
            'id' => self::$nextId++,
            'dua_key' => $key,
            'kind' => 'hadith',
            'group_id' => null,
            'position' => 1,
            'source_id' => fn (): int => (int) DB::table('content_sources')->where('code', 'hadeethenc')->value('id'),
            'source_key' => (string) fake()->numberBetween(1, 9999),
        ];
    }

    public function quran(string $duaKey = 'quran:1:1-1'): static
    {
        return $this->state(fn (): array => [
            'dua_key' => $duaKey,
            'kind' => 'quran',
            'source_id' => null,
            'source_key' => null,
        ]);
    }
}

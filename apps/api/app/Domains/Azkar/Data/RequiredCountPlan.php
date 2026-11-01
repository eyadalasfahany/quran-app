<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

/**
 * What the secondary source adds to the primary's counts (ADR 0031 §6 and §12, developer 1 Nov 2026). Keys, counts and
 * source codes only, never text.
 */
final class RequiredCountPlan extends Data
{
    /**
     * @param  array<string, array{count: int, source: string}>  $fills  Item key => the count taken from the secondary.
     * @param  list<array{item: string, entry_index: int, entry: string, primary: int, secondary: int}>  $conflicts  The primary kept.
     * @param  list<array{item: string, entry_index: int, entry: string, primary_recitations: int, secondary_dhikr: int}>  $ambiguous  Left null.
     * @param  int  $withoutSecondary  Items with no count whose book number the secondary does not supply a count for.
     */
    public function __construct(
        public readonly array $fills,
        public readonly array $conflicts,
        public readonly array $ambiguous,
        public readonly int $withoutSecondary,
    ) {}

    public static function none(): self
    {
        return new self([], [], [], 0);
    }
}

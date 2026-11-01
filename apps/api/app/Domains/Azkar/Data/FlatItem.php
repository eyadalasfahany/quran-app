<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

/**
 * One azkar item after its steps are flattened (ADR 0031 transformation rules). Arabic is exactly as received.
 */
final class FlatItem extends Data
{
    /**
     * @param  list<array{id: string, reciterId: string, url: string, durationSeconds: int}>  $recordings
     */
    public function __construct(
        public readonly int $entryIndex,
        public readonly string $entryKey,
        public readonly string $variationKey,
        public readonly string $itemKey,
        public readonly int $position,
        public readonly string $kind,
        public readonly ?string $textAr,
        public readonly ?string $textEn,
        public readonly ?string $transliteration,
        public readonly ?string $speaker,
        public readonly ?string $sourceDuaId,
        public readonly ?int $requiredCount,
        public readonly ?int $repeatGroup,
        public readonly ?int $repeatTimes,
        public readonly array $recordings,
    ) {}
}

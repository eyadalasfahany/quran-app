<?php

declare(strict_types=1);

namespace App\Domains\Content\Timings;

/**
 * One ayah row of a committed timing file. Segments are the decoded list as written: null when the file has none, and
 * an empty array when the value was not a list (so the importer nulls it, as it does any malformed verse).
 */
final readonly class TaybahTimingAyah
{
    /**
     * @param  array<mixed>|null  $segments
     */
    public function __construct(
        public string $verseKey,
        public int $verseId,
        public int $startMs,
        public int $endMs,
        public ?array $segments,
    ) {}
}

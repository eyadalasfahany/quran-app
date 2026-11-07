<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * One classified gap of the measurement (gaps/decisions/{slug}.json, ADR 0076 gap decisions, step 6b.6). Numbers are strings.
 * The builder never re-classifies: it re-checks only what 8.5 lists.
 */
final readonly class GapDecision
{
    public function __construct(
        public string $hadith,
        public ?string $runFirst,
        public ?string $runLast,
        public ?string $reason,
        public string $class,
        public string $source,
        public ?string $prev,
        public ?string $next,
        public ?int $openitiUnit,
        public ?string $openitiUnitNumber,
        public ?int $hapiNumbersInRecord,
    ) {}
}

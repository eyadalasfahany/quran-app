<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * The validated decisions file of one collection (gaps/decisions/{slug}.json). The code reads only these keys.
 */
final readonly class GapDecisions
{
    /**
     * @param  array{source: string, path: string, sha256: string}  $openiti
     * @param  list<GapDecision>  $entries
     */
    public function __construct(
        public string $collection,
        public array $openiti,
        public string $fawazahmed0Commit,
        public float $containmentThreshold,
        public array $entries,
    ) {}
}

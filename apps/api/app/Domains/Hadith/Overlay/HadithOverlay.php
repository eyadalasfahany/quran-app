<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * The applied gaps data for one collection (ADR 0076, steps 6b.3 and 6b.4): merges, fills, extra books, and the origin ids and
 * versions the rows need. Built by HadithOverlayBuilder from a validated gaps file. Unresolved numbers are not carried: they
 * never resolve anything.
 */
final readonly class HadithOverlay
{
    /**
     * @param  array<string, string>  $merges  merged number => covering number
     * @param  array<string, int>  $originSourceIds  origin code => content_sources.id
     * @param  array<string, string>  $originVersions  origin code => source_version
     * @param  array<string, GapFill>  $fills  number => fill
     * @param  list<GapBook>  $books  extra books, in file order
     * @param  list<string>  $refusedFills  numbers whose fill contains markup (ADR 0076 Q2); they stay unknown
     * @param  list<string>  $unavailable  numbers unrecoverable from every source: a placeholder row each (ADR 0076, rule amended 7 Nov 2026)
     */
    public function __construct(
        public array $merges,
        public array $originSourceIds,
        public array $originVersions,
        public array $fills = [],
        public array $books = [],
        public array $refusedFills = [],
        public array $unavailable = [],
    ) {}
}

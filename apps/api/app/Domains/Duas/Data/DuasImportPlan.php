<?php

declare(strict_types=1);

namespace App\Domains\Duas\Data;

/**
 * The rows one Duas import would write (ADR 0044-duas §6).
 *
 * @phpstan-type Row array<string, int|string|null>
 */
final class DuasImportPlan
{
    /**
     * @param  list<Row>  $items
     * @param  list<Row>  $quranSpans
     * @param  list<Row>  $groups
     * @param  list<Row>  $hadith
     * @param  list<Row>  $links
     * @param  list<Row>  $collectionRefs
     * @param  list<Row>  $collectionBooks
     */
    public function __construct(
        public readonly array $items,
        public readonly array $quranSpans,
        public readonly array $groups,
        public readonly array $hadith,
        public readonly array $links,
        public readonly array $collectionRefs,
        public readonly array $collectionBooks,
        public readonly DuasImportStats $stats,
    ) {}
}

<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Validation;

use App\Domains\Seerah\Canonical\CanonicalBook;
use App\Domains\Seerah\Dataset\BookIndex;
use App\Domains\Seerah\Dataset\SeerahDataset;

/**
 * Everything one validation run reads: the parsed data, the canonical book and its index, the configuration, and the mode.
 * `sourceSha256` is the SHA-256 of the source file actually read; `pins` are the configured pins (null for a run over another file).
 *
 * @param  array{source_sha256: string, canonical_sha256: ?string}|null  $pins  null when the run is over another file (--source)
 * @param  array{south: float, west: float, north: float, east: float}  $geoBox
 * @param  array<string, array{from: string, to: string, start_title: string, period: string}>  $batches
 * @param  array<string, int>  $yearHeadings
 * @param  list<string>  $milestoneKeys
 * @param  array{sections: int, paragraphs: int, places: int, exclusions: int, routes: int, milestones: int, events: array<string, int>}|null  $counts  pins, or null
 */
final readonly class ValidationContext
{
    public function __construct(
        public string $sourceSha256,
        public bool $release,
        public bool $complete,
        public ?array $pins,
        public CanonicalBook $book,
        public BookIndex $index,
        public SeerahDataset $data,
        public array $batches,
        public array $yearHeadings,
        public array $milestoneKeys,
        public array $geoBox,
        public ?array $counts,
        public int $ageMin,
        public int $ageMax,
    ) {}
}

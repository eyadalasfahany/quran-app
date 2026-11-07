<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Import\Records\MappingResult;
use App\Domains\Hadith\Overlay\ChapterAlignment;
use App\Domains\Hadith\Overlay\OpenItiChapterScan;
use App\Domains\Hadith\Overlay\OpenItiUnit;

/**
 * What the OpenITI matchers read for one collection (dev only): the importer's mapping of the fawazahmed0 snapshot, the scanned
 * OpenITI file, the provenance meta and the pinned unit => number alignment (null when the collection has none).
 */
final readonly class OpenItiCollectionInputs
{
    /**
     * @param  array{release: string, doi: string, version_id: string, source_file_sha256: string, licence: string}  $meta
     */
    public function __construct(
        public MappingResult $mapping,
        public OpenItiChapterScan $scan,
        public array $meta,
        public ?ChapterAlignment $alignment,
    ) {}

    /**
     * The fawazahmed0 number of a unit: through the alignment when there is one (an unaligned unit has none), else the unit's own
     * number as printed in the file.
     */
    public function numberOf(OpenItiUnit $unit): ?string
    {
        if ($this->alignment !== null) {
            return $this->alignment->numberOf($unit->index);
        }

        return $unit->number === null ? null : (string) $unit->number;
    }
}

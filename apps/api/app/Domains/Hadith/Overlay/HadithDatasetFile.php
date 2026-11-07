<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * One pinned dataset file read for one collection (ADR 0076, gap-report extension). $texts holds the record texts in file
 * order, exactly as the dataset has them. Only the builder reads it, and only through HadithDatasets.
 */
final readonly class HadithDatasetFile
{
    /**
     * @param  list<string>  $texts
     */
    public function __construct(
        public string $name,
        public string $sha256,
        public array $texts,
    ) {}
}

<?php

declare(strict_types=1);

namespace App\Domains\Content\Timings;

use App\Domains\Content\Enums\TaybahTimingKind;
use App\Domains\Content\Enums\TaybahTimingSource;

/**
 * One validated committed timing file (format 1). The file's own checks against the database happen in the importer.
 */
final readonly class TaybahTimingFile
{
    /**
     * @param  array<string, mixed>|null  $models
     * @param  list<TaybahTimingAyah>  $ayahs
     */
    public function __construct(
        public TaybahTimingKind $kind,
        public string $recitationKey,
        public int $chapterId,
        public string $audioUrl,
        public int $audioBytes,
        public string $audioSha256,
        public int $measuredDurationMs,
        public TaybahTimingSource $source,
        public string $toolVersion,
        public ?array $models,
        public ?int $originalFirstStartMs,
        public string $fileSha256,
        public array $ayahs,
    ) {}
}

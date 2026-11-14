<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Import;

use App\Domains\Seerah\Enums\ImportMode;
use App\Domains\Seerah\Exceptions\SeerahImportException;

/**
 * The rules that decide whether an import may start, before anything is read (ADR 0089, «Build decisions»). Draft data
 * (structure mode) never reaches production, and a production import is a release import.
 */
final class SeerahImportGuard
{
    /**
     * @throws SeerahImportException
     */
    public function assertAllowed(bool $production, ImportMode $mode, bool $buildPacks, bool $deferPack): void
    {
        if ($buildPacks && $deferPack) {
            throw new SeerahImportException('Choose --build-packs or --defer-pack, not both.');
        }

        if ($production && $mode === ImportMode::Structure) {
            throw new SeerahImportException('Production imports need --release. Draft data (--structure) is never imported in production.');
        }
    }
}

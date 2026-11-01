<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Sources;

/**
 * Everything an import needs to know about one source, read from config at the moment of the import (ADR 0031 §1, §12).
 * The importer, validator and transformer take this instead of reading OpenDua's keys directly.
 */
final class SourceProfile
{
    public function __construct(
        public readonly string $code,
        public readonly string $version,
        public readonly string $pinnedSha256,
        public readonly string $collectionId,
        public readonly string $sourceKey,
        public readonly string $displayName,
        public readonly bool $importEnabled,
        public readonly bool $storeEnglish,
        public readonly bool $audioRightsVerified,
        public readonly string $importFlagKey,
    ) {}
}

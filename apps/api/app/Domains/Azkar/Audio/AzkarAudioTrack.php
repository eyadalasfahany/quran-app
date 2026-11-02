<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Audio;

/**
 * One shipped recording file from the pinned audio manifest (ADR 0040). Holds ids, sizes and hashes only.
 */
final readonly class AzkarAudioTrack
{
    public function __construct(
        public string $name,
        public string $key,
        public string $entryKey,
        public int $bytes,
        public string $sha256,
        public int $durationSeconds,
    ) {}
}

<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources\Records;

/**
 * One line of the snapshot report. Status is verified, cached, new, same or DIFFERS.
 */
final readonly class SnapshotFileResult
{
    public function __construct(
        public string $path,
        public int $bytes,
        public string $sha256,
        public string $status,
    ) {}
}

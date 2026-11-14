<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Services;

use App\Domains\Seerah\Canonical\BookCanonicalizer;
use App\Domains\Seerah\Canonical\CanonicalBuild;
use App\Domains\Seerah\Exceptions\SeerahCanonicalException;

/**
 * Reads the pinned source, checks its SHA-256, canonicalizes it and checks the canonical SHA-256 pin (V1). Over another file
 * (tests and dev runs with --source) the pins are not checked and the build says so.
 */
final class CanonicalBookBuilder
{
    public function build(?string $sourcePath): CanonicalBuild
    {
        $pinsChecked = $sourcePath === null;
        $path = $sourcePath ?? database_path((string) config('seerah.source.file'));

        if (! is_file($path)) {
            throw new SeerahCanonicalException('The source file is missing (source_missing).');
        }

        $bytes = file_get_contents($path);

        if ($bytes === false) {
            throw new SeerahCanonicalException('The source file cannot be read (source_missing).');
        }

        $sourceSha256 = hash('sha256', $bytes);

        if ($pinsChecked && ! hash_equals((string) config('seerah.source.sha256'), $sourceSha256)) {
            throw new SeerahCanonicalException('The source file differs from its pin (source_sha_mismatch).');
        }

        $book = (new BookCanonicalizer)->canonicalize($bytes);
        $canonicalSha256 = $book->sha256();
        $pin = config('seerah.canonical_sha256');

        if ($pinsChecked && is_string($pin) && ! hash_equals($pin, $canonicalSha256)) {
            throw new SeerahCanonicalException('The canonical text differs from its pin (canonical_sha_mismatch).');
        }

        return new CanonicalBuild(
            book: $book,
            sourceSha256: $sourceSha256,
            canonicalSha256: $canonicalSha256,
            pinsChecked: $pinsChecked,
            canonicalPinMissing: $pin === null,
        );
    }
}

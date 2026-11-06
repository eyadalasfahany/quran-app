<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources;

use App\Domains\Hadith\Exceptions\HadithPinException;

/**
 * Checks bytes against the SHA-256 pins in config('hadith.files') (ADR 0042 §4). A null pin is a refusal, always.
 * Reads config on every call, so a test can change the pins.
 */
final class PinnedFileVerifier
{
    /**
     * @return list<string>
     */
    public function paths(): array
    {
        $paths = [];

        foreach (array_keys($this->files()) as $path) {
            $paths[] = (string) $path;
        }

        return $paths;
    }

    /**
     * The paths whose pin is not recorded yet.
     *
     * @return list<string>
     */
    public function unrecorded(): array
    {
        $missing = [];

        foreach ($this->files() as $path => $pin) {
            if ($pin === null) {
                $missing[] = $path;
            }
        }

        return $missing;
    }

    /**
     * The pin, or null when not recorded.
     *
     * @throws HadithPinException for a path that is not a pinned file
     */
    public function expected(string $path): ?string
    {
        $files = $this->files();

        if (! array_key_exists($path, $files)) {
            throw new HadithPinException('The path ['.$path.'] is not a pinned file.');
        }

        return $files[$path];
    }

    /**
     * @throws HadithPinException listing every path whose pin is not recorded
     */
    public function assertAllRecorded(): void
    {
        $missing = $this->unrecorded();

        if ($missing !== []) {
            throw new HadithPinException('The pins for ['.implode(', ', $missing).'] are not recorded in config/hadith.php.');
        }
    }

    /**
     * @throws HadithPinException when the pin is null or the bytes do not match
     */
    public function verify(string $path, string $bytes): void
    {
        $expected = $this->expected($path);

        if ($expected === null) {
            throw new HadithPinException('The pin for ['.$path.'] is not recorded in config/hadith.php; run hadith:snapshot --record and have the developer approve the hashes.');
        }

        if (! hash_equals($expected, hash('sha256', $bytes))) {
            throw new HadithPinException('The bytes for ['.$path.'] do not match the pinned SHA-256; nothing was written.');
        }
    }

    /**
     * False, never a throw, for a null pin or a mismatch. Used for cache hits.
     */
    public function matches(string $path, string $bytes): bool
    {
        $expected = $this->files()[$path] ?? null;

        return $expected !== null && hash_equals($expected, hash('sha256', $bytes));
    }

    /**
     * @return array<string, string|null>
     */
    private function files(): array
    {
        $files = config('hadith.files');

        if (! is_array($files)) {
            return [];
        }

        $pins = [];

        foreach ($files as $path => $pin) {
            $pins[(string) $path] = is_string($pin) ? $pin : null;
        }

        return $pins;
    }
}

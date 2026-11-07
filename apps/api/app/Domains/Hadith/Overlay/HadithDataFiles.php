<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

use App\Domains\Hadith\Exceptions\HadithDataFileException;

/**
 * The only reader of the committed Hadith data files (ADR 0076 §2, step 6b). Read-only: it never writes. A file is read only
 * when its SHA-256 matches the pin in config('hadith.data_files'), and the hash is checked before anything is parsed.
 */
final class HadithDataFiles
{
    private const string PATH_PATTERN = '~^(chapters|gaps|gaps/decisions)/[a-z0-9]+\.json$~';

    private const string PIN_PATTERN = '~^[0-9a-f]{64}$~';

    public function __construct(private readonly ?string $baseDirectory = null) {}

    /**
     * The verified bytes of a data file, or null when there is neither a file nor a pin.
     *
     * @throws HadithDataFileException with a code in the message: bad_path, pin_missing, file_missing, pin_malformed, sha_mismatch
     */
    public function readVerified(string $relativePath): ?string
    {
        $path = $this->absolutePath($relativePath);
        $pin = $this->pin($relativePath);
        $exists = is_file($path);

        if ($pin === null) {
            if ($exists) {
                throw new HadithDataFileException('Data file ['.$relativePath.'] exists but has no pin (pin_missing).');
            }

            return null;
        }

        if (preg_match(self::PIN_PATTERN, $pin) !== 1) {
            throw new HadithDataFileException('Pin of data file ['.$relativePath.'] is not a lowercase SHA-256 (pin_malformed).');
        }

        if (! $exists) {
            throw new HadithDataFileException('Pinned data file ['.$relativePath.'] is missing (file_missing).');
        }

        $bytes = file_get_contents($path);

        if ($bytes === false) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] cannot be read (file_missing).');
        }

        if (! hash_equals($pin, hash('sha256', $bytes))) {
            throw new HadithDataFileException('Data file ['.$relativePath.'] differs from its pin (sha_mismatch).');
        }

        return $bytes;
    }

    /**
     * The pinned SHA-256 of a data file, or null when it has no pin.
     */
    public function pin(string $relativePath): ?string
    {
        $this->assertPath($relativePath);

        $pins = config('hadith.data_files', []);
        $pin = is_array($pins) ? ($pins[$relativePath] ?? null) : null;

        return is_string($pin) ? $pin : null;
    }

    /**
     * The SHA-256 of the bytes on disk, or null when the file does not exist.
     */
    public function actualSha256(string $relativePath): ?string
    {
        $path = $this->absolutePath($relativePath);

        if (! is_file($path)) {
            return null;
        }

        $bytes = file_get_contents($path);

        return $bytes === false ? null : hash('sha256', $bytes);
    }

    private function absolutePath(string $relativePath): string
    {
        $this->assertPath($relativePath);

        return $this->baseDirectory !== null
            ? rtrim($this->baseDirectory, '/').'/'.$relativePath
            : database_path('data/hadith/'.$relativePath);
    }

    /**
     * @throws HadithDataFileException
     */
    private function assertPath(string $relativePath): void
    {
        if (preg_match(self::PATH_PATTERN, $relativePath) !== 1) {
            throw new HadithDataFileException('Data file path ['.$relativePath.'] is outside the allowed folders (bad_path).');
        }
    }
}

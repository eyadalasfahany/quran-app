<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Sources;

use App\Domains\Azkar\Exceptions\SnapshotException;

/**
 * Reads a HadeethEnc snapshot after checking it against its own manifest and the configured pin (ADR 0031 §12).
 * A snapshot that fails either check is never used.
 */
final class HadeethEncSnapshot
{
    /**
     * @param  non-empty-string  $configPrefix
     * @return array<int, array<string, mixed>> Hadith records keyed by id, as the API returned them.
     *
     * @throws SnapshotException
     */
    public function load(string $directory, string $configPrefix = 'azkar.hadeethenc'): array
    {
        $manifestPath = $directory.DIRECTORY_SEPARATOR.'manifest.json';
        $manifest = is_file($manifestPath) ? json_decode((string) file_get_contents($manifestPath), true) : null;

        if (! is_array($manifest) || ! is_array($manifest['files'] ?? null) || ! is_string($manifest['sha256'] ?? null)) {
            throw new SnapshotException('The HadeethEnc snapshot has no readable manifest.');
        }

        $pin = (string) config($configPrefix.'.snapshot_sha256', '');

        if ($pin === '' || ! hash_equals($pin, $manifest['sha256'])) {
            throw new SnapshotException('The HadeethEnc snapshot does not match the pinned SHA-256 in config.');
        }

        $hashes = [];
        $records = [];

        foreach ($manifest['files'] as $name => $expected) {
            if (! is_string($name) || $name !== basename($name) || ! is_string($expected)) {
                throw new SnapshotException('The HadeethEnc manifest lists a file name that is not allowed.');
            }

            $path = $directory.DIRECTORY_SEPARATOR.$name;
            $bytes = is_file($path) ? file_get_contents($path) : false;

            if ($bytes === false || ! hash_equals($expected, hash('sha256', $bytes))) {
                throw new SnapshotException('A HadeethEnc snapshot file does not match its manifest hash.');
            }

            $hashes[$name] = $expected;

            if (preg_match('/^hadith-(\d+)\.json$/', $name, $matches) === 1) {
                $body = str_starts_with($bytes, "\xEF\xBB\xBF") ? substr($bytes, 3) : $bytes;
                $record = json_decode($body, true, 512, JSON_THROW_ON_ERROR);

                if (! is_array($record)) {
                    throw new SnapshotException('A HadeethEnc hadith file does not hold a JSON object.');
                }

                $records[(int) $matches[1]] = $record;
            }
        }

        ksort($hashes);

        if (! hash_equals($manifest['sha256'], hash('sha256', (string) json_encode($hashes, JSON_THROW_ON_ERROR)))) {
            throw new SnapshotException('The HadeethEnc manifest does not match its whole-file SHA-256.');
        }

        return $records;
    }
}

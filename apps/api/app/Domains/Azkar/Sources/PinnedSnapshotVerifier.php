<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Sources;

use App\Support\Storage\SourceCache;
use Illuminate\Support\Facades\File;

/**
 * Checks a snapshot directory on disk against the configured manifest pin (plan step 14 §6). Used at web start so
 * `azkar:snapshot --pinned` skips network I/O when the folder already matches every pinned file SHA-256.
 */
final class PinnedSnapshotVerifier
{
    /**
     * @param  non-empty-string  $packNamespace  Storage and config namespace: `azkar` or `duas`.
     * @return array{directory: string, manifest_sha256: string}|null
     */
    public function existing(string $source, string $date, string $pin, string $packNamespace = 'azkar'): ?array
    {
        if ($pin === '' || preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) !== 1) {
            return null;
        }

        if (! in_array($source, ['hisnmuslim', 'hadeethenc'], true)) {
            return null;
        }

        if (! in_array($packNamespace, ['azkar', 'duas'], true)) {
            return null;
        }

        if ($packNamespace === 'duas' && $source !== 'hadeethenc') {
            return null;
        }

        $directory = SourceCache::path($packNamespace.'/'.$source.'/'.$date);
        $manifestPath = $directory.DIRECTORY_SEPARATOR.'manifest.json';

        if (! File::isFile($manifestPath)) {
            return null;
        }

        try {
            /** @var array<string, mixed> $manifest */
            $manifest = json_decode((string) File::get($manifestPath), true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        $manifestSha = is_string($manifest['sha256'] ?? null) ? $manifest['sha256'] : '';

        if ($manifestSha === '' || ! hash_equals($pin, $manifestSha)) {
            return null;
        }

        $files = $manifest['files'] ?? null;

        if (! is_array($files) || $files === []) {
            return null;
        }

        foreach ($files as $name => $expectedHash) {
            if (! is_string($name) || $name === '' || str_contains($name, '..') || str_contains($name, DIRECTORY_SEPARATOR)) {
                return null;
            }

            if (! is_string($expectedHash) || preg_match('/^[0-9a-f]{64}$/', $expectedHash) !== 1) {
                return null;
            }

            $path = $directory.DIRECTORY_SEPARATOR.$name;

            if (! File::isFile($path)) {
                return null;
            }

            $actual = hash('sha256', (string) File::get($path));

            if (! hash_equals($expectedHash, $actual)) {
                return null;
            }
        }

        return [
            'directory' => $directory,
            'manifest_sha256' => $manifestSha,
        ];
    }
}

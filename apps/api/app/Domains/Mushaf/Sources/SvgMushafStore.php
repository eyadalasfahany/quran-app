<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Sources;

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use App\Support\Storage\SourceCache;
use Illuminate\Support\Facades\File;

/**
 * The cache of pinned quran-svg files, kept at their source-relative paths under the commit's folder (ADR 0068). Writes go to
 * a partial file first and are then renamed, as SnapshotStore does. Paths are checked before use. Another pinned source (the
 * quran-text files) passes its own cache folder.
 */
final class SvgMushafStore
{
    public function __construct(private readonly ?string $root = null) {}

    public function directory(): string
    {
        return SourceCache::path($this->root ?? 'svg-mushaf/'.(string) config('mushaf.commit'));
    }

    public function has(string $base, string $relative): bool
    {
        return File::isFile($this->path($base, $relative));
    }

    public function read(string $base, string $relative): string
    {
        return (string) File::get($this->path($base, $relative));
    }

    public function write(string $base, string $relative, string $bytes): void
    {
        $this->writeAtomically($this->path($base, $relative), $bytes);
    }

    public function delete(string $base, string $relative): void
    {
        File::delete($this->path($base, $relative));
    }

    /**
     * Writes the gzip beside the raw file and returns its digest, read back from the written file.
     *
     * @return array{sha256: string, bytes: int}
     */
    public function writeGzip(string $base, string $relative, string $bytes): array
    {
        $target = $this->path($base, $relative).'.gz';
        $this->writeAtomically($target, (string) gzencode($bytes, 9));

        return ['sha256' => (string) hash_file('sha256', $target), 'bytes' => (int) filesize($target)];
    }

    private function path(string $base, string $relative): string
    {
        foreach ([$base, $relative] as $part) {
            if (preg_match('#^[A-Za-z0-9._/-]+$#', $part) !== 1 || str_contains($part, '..') || str_starts_with($part, '/')) {
                throw new SvgMushafSourceException('The path ['.$part.'] is not a safe cache path.');
            }
        }

        return $this->directory().'/'.$base.'/'.$relative;
    }

    private function writeAtomically(string $target, string $bytes): void
    {
        File::ensureDirectoryExists(dirname($target));

        $partial = $target.'.'.bin2hex(random_bytes(4)).'.part';
        File::put($partial, $bytes);

        if (File::exists($target)) {
            File::delete($target);
        }

        File::move($partial, $target);
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources;

use App\Support\Storage\SourceCache;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;

/**
 * The cache folder for the pinned Hadith files: {cache_root}/hadith/{commit}/ (ADR 0068). Every path must be a pinned file,
 * so `..` and absolute paths are refused.
 */
final class SnapshotStore
{
    public function directory(): string
    {
        return SourceCache::path('hadith/'.(string) config('hadith.commit'));
    }

    public function path(string $relative): string
    {
        return $this->directory().'/'.$this->pinnedPath($relative);
    }

    public function has(string $relative): bool
    {
        return File::isFile($this->path($relative));
    }

    /**
     * The caller checks has() first.
     */
    public function read(string $relative): string
    {
        return (string) File::get($this->path($relative));
    }

    /**
     * Writes through a partial file, then moves it over the target.
     */
    public function write(string $relative, string $bytes): void
    {
        $target = $this->path($relative);
        File::ensureDirectoryExists(dirname($target));

        $partial = $target.'.'.bin2hex(random_bytes(4)).'.part';
        File::put($partial, $bytes);

        if (File::exists($target)) {
            File::delete($target);
        }

        File::move($partial, $target);
    }

    public function delete(string $relative): void
    {
        $target = $this->path($relative);

        if (File::isFile($target)) {
            File::delete($target);
        }
    }

    /**
     * @throws InvalidArgumentException when the path is not a key of config('hadith.files')
     */
    private function pinnedPath(string $relative): string
    {
        $files = config('hadith.files');

        if (! is_array($files) || ! array_key_exists($relative, $files)) {
            throw new InvalidArgumentException('Not a pinned Hadith file ['.$relative.'].');
        }

        return $relative;
    }
}

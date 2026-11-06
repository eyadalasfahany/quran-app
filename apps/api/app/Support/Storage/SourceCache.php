<?php

declare(strict_types=1);

namespace App\Support\Storage;

/**
 * The one root for downloaded, pinned upstream files (snapshots, the OpenDua catalogue). Lives under app/private so it
 * sits on the Railway volume and a deploy does not re-download it (ADR 0068). Every file is still verified against its
 * pin before use.
 */
final class SourceCache
{
    /**
     * @param  string  $relative  A path under the cache root, e.g. `azkar/hisnmuslim/2026-01-01`. Leading slashes are ignored.
     */
    public static function path(string $relative = ''): string
    {
        $root = rtrim((string) config('content_sources.cache_root'), '/');
        $tail = ltrim($relative, '/');

        return $tail === '' ? $root : $root.'/'.$tail;
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Audio;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

/**
 * The Taybah-hosted recording files on the azkar_audio disk, at {audio_version}/{file name} (ADR 0040 §2).
 * The file-name pattern is the only thing a request path can contribute to a file path, so traversal is impossible.
 */
final class AzkarAudioFiles
{
    public const string DISK = 'azkar_audio';

    /** A shipped file: OD-001.mp3, or one part of a multi-part entry: OD-077-1.mp3. */
    public const string NAME_PATTERN = '/^OD-\d{3}(?:-\d{1,2})?\.mp3$/';

    /** The same pattern as a route parameter constraint (no delimiters). */
    public const string ROUTE_NAME_REGEX = 'OD-\d{3}(?:-\d{1,2})?\.mp3';

    public const string ROUTE_VERSION_REGEX = '\d+\.\d+\.\d+';

    public function version(): string
    {
        return (string) config('azkar.audio_version');
    }

    public function isValidName(string $name): bool
    {
        return preg_match(self::NAME_PATTERN, $name) === 1;
    }

    public function disk(): Filesystem
    {
        return Storage::disk(self::DISK);
    }

    public function relativePath(string $version, string $name): string
    {
        return $version.'/'.$name;
    }

    public function absolutePath(string $version, string $name): string
    {
        return $this->disk()->path($this->relativePath($version, $name));
    }

    /**
     * Present and exactly the manifest's size. Hashing is left to azkar:audio-verify --full.
     */
    public function hasExpectedSize(AzkarAudioTrack $track): bool
    {
        $path = $this->absolutePath($this->version(), $track->name);

        return is_file($path) && filesize($path) === $track->bytes;
    }
}

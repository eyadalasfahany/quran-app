<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Audio;

use App\Domains\Azkar\Exceptions\AudioException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

/**
 * Puts every shipped recording on the azkar_audio disk (ADR 0040 decision 2, plan step 14 §4). Each file is downloaded
 * (or copied from a folder), written to a temporary name, checked against the manifest's size and SHA-256, and only then
 * renamed into place. A file already present and verified is skipped, so a rerun after an interruption resumes.
 */
final class AzkarAudioSync
{
    public function __construct(
        private readonly AzkarAudioManifest $manifest,
        private readonly AzkarAudioFiles $files,
    ) {}

    /**
     * @param  ?string  $from  A folder holding the files by name, copied instead of downloaded (the fallback or local copy).
     * @return array{shipped: int, present: int, written: int, failed: list<string>}
     *
     * @throws AudioException
     */
    public function run(?string $from = null): array
    {
        $version = $this->files->version();
        $result = ['shipped' => 0, 'present' => 0, 'written' => 0, 'failed' => []];

        foreach ($this->manifest->shipped() as $track) {
            $result['shipped']++;

            if ($this->isVerified($version, $track)) {
                $result['present']++;

                continue;
            }

            $bytes = $from !== null ? $this->readFrom($from, $track) : $this->download($track);

            if ($bytes === null || ! $this->bytesMatch($track, $bytes)) {
                $result['failed'][] = $track->name;

                continue;
            }

            if ($this->write($version, $track, $bytes)) {
                $result['written']++;
            } else {
                $result['failed'][] = $track->name;
            }

            if ($from === null) {
                $this->pause();
            }
        }

        return $result;
    }

    private function isVerified(string $version, AzkarAudioTrack $track): bool
    {
        $path = $this->files->absolutePath($version, $track->name);

        return is_file($path) && filesize($path) === $track->bytes && hash_file('sha256', $path) === $track->sha256;
    }

    private function bytesMatch(AzkarAudioTrack $track, string $bytes): bool
    {
        return strlen($bytes) === $track->bytes && hash_equals($track->sha256, hash('sha256', $bytes));
    }

    private function readFrom(string $folder, AzkarAudioTrack $track): ?string
    {
        $path = rtrim($folder, DIRECTORY_SEPARATOR.'/').DIRECTORY_SEPARATOR.$track->name;
        $bytes = is_file($path) ? file_get_contents($path) : false;

        return $bytes === false ? null : $bytes;
    }

    private function download(AzkarAudioTrack $track): ?string
    {
        $base = rtrim((string) config('azkar.audio.base_url'), '/');
        $response = Http::withUserAgent($this->userAgent())
            ->timeout(120)
            ->retry(3, (int) config('azkar.audio.retry_delay_ms', 1000), throw: false)
            ->get($base.'/'.$track->key);

        return $response->successful() ? $response->body() : null;
    }

    /**
     * Writes the verified bytes to a temporary name, checks the file on disk, then renames it. A mismatch deletes the
     * temporary file and leaves nothing under the final name.
     */
    private function write(string $version, AzkarAudioTrack $track, string $bytes): bool
    {
        $final = $this->files->absolutePath($version, $track->name);
        $partial = $final.'.'.bin2hex(random_bytes(4)).'.part';

        File::ensureDirectoryExists(dirname($final));
        File::put($partial, $bytes);

        if (! is_file($partial) || filesize($partial) !== $track->bytes || hash_file('sha256', $partial) !== $track->sha256) {
            File::delete($partial);

            return false;
        }

        if (is_file($final)) {
            File::delete($final);
        }

        File::move($partial, $final);

        return true;
    }

    private function pause(): void
    {
        $gap = (int) config('azkar.audio.gap_ms', 300);

        if ($gap > 0) {
            usleep($gap * 1000);
        }
    }

    private function userAgent(): string
    {
        $email = config('quran.qf.contact_email');

        return is_string($email) && $email !== '' ? 'Taybah/1.0 (+mailto:'.$email.')' : 'Taybah/1.0';
    }
}

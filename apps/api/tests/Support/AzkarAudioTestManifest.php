<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\ParallelTesting;

/*
| Test-only Azkar audio manifest (ADR 0040, plan step 14). Every file is placeholder bytes («FIXTURE audio bytes»), never
| real audio. The real pinned manifest is never used by these tests: the config is pointed at this one for the test.
*/

/**
 * The folder this worker's audio fixtures live in. Each parallel worker has its own, so one worker never deletes another's files.
 */
function azkarAudioTestDir(): string
{
    return storage_path('framework/testing/azkar-audio-test-'.(ParallelTesting::token() ?: 'serial'));
}

/**
 * Writes a manifest with one track per name and points config azkar.audio at it. Names follow the OpenDua pattern.
 *
 * @param  array<string, string>  $bytesByName  File name => placeholder bytes the track's size and hash come from.
 */
function azkarAudioTestManifest(array $bytesByName): void
{
    $dir = azkarAudioTestDir();
    File::ensureDirectoryExists($dir);

    $tracks = [];

    foreach ($bytesByName as $name => $bytes) {
        $id = substr($name, 0, -4);

        $tracks[] = [
            'id' => $id,
            'entryId' => substr($name, 0, 6),
            'partIndex' => null,
            'key' => 'hisn/v0.0.2/'.$name,
            'bytes' => strlen($bytes),
            'sha256' => hash('sha256', $bytes),
            'durationSeconds' => 3,
        ];
    }

    $json = json_encode(['version' => '0.0.2', 'tracks' => $tracks], JSON_THROW_ON_ERROR);
    $path = $dir.'/manifest-'.bin2hex(random_bytes(4)).'.json';
    File::put($path, $json);

    config([
        'azkar.audio.manifest_path' => $path,
        'azkar.audio.manifest_sha256' => hash('sha256', $json),
        'azkar.audio.gap_ms' => 0,
        'azkar.audio.retry_delay_ms' => 0,
    ]);
}

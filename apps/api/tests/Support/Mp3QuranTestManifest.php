<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\ParallelTesting;

/*
| Test-only MP3Quran manifest (ADR 0061). Every file is a placeholder («قارئ تجريبي» names, FIXTURE hashes). The real
| committed manifest is never used by these tests: the config is pointed at the file written here.
*/

/**
 * Writes a manifest with the given moshafs and points config quran.mp3quran_manifest_path at it.
 *
 * @param  list<array<string, mixed>>  $moshafs
 */
function mp3QuranTestManifest(array $moshafs): string
{
    $dir = storage_path('framework/testing/mp3quran-'.(ParallelTesting::token() ?: 'serial'));
    File::ensureDirectoryExists($dir);

    $path = $dir.'/manifest-'.bin2hex(random_bytes(4)).'.json';
    File::put($path, json_encode([
        'schema' => 1,
        'source' => 'mp3quran',
        'public_base' => 'https://audio.example.test',
        'generated_at' => '2026-11-05T00:00:00Z',
        'moshafs' => $moshafs,
    ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

    config(['quran.mp3quran_manifest_path' => $path]);

    return $path;
}

/**
 * One valid moshaf with placeholder names and one file per surah. Overrides are merged over the defaults.
 *
 * @param  list<int>  $surahs
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function mp3QuranTestMoshaf(int $id, array $surahs, array $overrides = []): array
{
    $files = [];

    foreach ($surahs as $surah) {
        $sha256 = hash('sha256', "fixture-{$id}-{$surah}");
        $key = sprintf('audio/mp3quran/%d/%03d-%s.mp3', $id, $surah, substr($sha256, 0, 16));

        $files[] = [
            'surah' => $surah,
            'key' => $key,
            'url' => 'https://audio.example.test/'.$key,
            'sha256' => $sha256,
            'bytes' => 1000 + $surah,
            'duration_ms' => 60_000 + $surah,
            'source_url' => 'https://source.example.test/fixture/'.$surah.'.mp3',
            'source_etag' => '"fixture"',
        ];
    }

    return array_merge([
        'moshaf_id' => $id,
        'reciter_id' => $id,
        'name_ar' => 'قارئ تجريبي '.$id,
        'name_en' => 'Fixture Reciter '.$id,
        'riwayah' => 'حفص عن عاصم',
        'moshaf_name' => 'حفص عن عاصم - مرتل',
        'server' => 'https://source.example.test/fixture/',
        'surah_list' => $surahs,
        'files' => $files,
    ], $overrides);
}

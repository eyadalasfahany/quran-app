<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\ParallelTesting;

/*
| Test-only Way2Quran manifest (ADR 0074). Every file is a placeholder («قارئ تجريبي» names, FIXTURE hashes). The real
| committed manifest is never used by these tests: the config is pointed at the file written here. Helpers carry the
| way2Quran prefix because Pest test helpers are global across the suite.
*/

/**
 * Writes a manifest with the given reciters and points config quran.way2quran_manifest_path at it.
 *
 * @param  list<array<string, mixed>>  $reciters
 */
function way2QuranTestManifest(array $reciters, string $source = 'way2quran'): string
{
    $dir = storage_path('framework/testing/way2quran-'.(ParallelTesting::token() ?: 'serial'));
    File::ensureDirectoryExists($dir);

    $path = $dir.'/manifest-'.bin2hex(random_bytes(4)).'.json';
    File::put($path, json_encode([
        'schema' => 1,
        'source' => $source,
        'public_base' => 'https://audio.example.test',
        'generated_at' => '2026-11-07T00:00:00Z',
        'moshafs' => $reciters,
    ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

    config(['quran.way2quran_manifest_path' => $path]);

    return $path;
}

/**
 * One valid Way2Quran reciter (manifest moshaf shape) with placeholder names and one file per surah. The key prefix is
 * audio/way2quran/. Overrides are merged over the defaults.
 *
 * @param  list<int>  $surahs
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function way2QuranTestReciter(int $id, array $surahs, array $overrides = []): array
{
    $files = [];

    foreach ($surahs as $surah) {
        $sha256 = hash('sha256', "way2quran-fixture-{$id}-{$surah}");
        $key = sprintf('audio/way2quran/%d/%03d-%s.mp3', $id, $surah, substr($sha256, 0, 16));

        $files[] = [
            'surah' => $surah,
            'key' => $key,
            'url' => 'https://audio.example.test/'.$key,
            'sha256' => $sha256,
            'bytes' => 2000 + $surah,
            'duration_ms' => 90_000 + $surah,
            'source_url' => 'https://source.example.test/fixture/'.$surah.'.mp3',
            'source_etag' => null,
        ];
    }

    return array_merge([
        'moshaf_id' => $id,
        'reciter_id' => $id,
        'name_ar' => 'قارئ تجريبي '.$id,
        'name_en' => 'Fixture Way2Quran Reciter '.$id,
        'riwayah' => 'حفص عن عاصم',
        'moshaf_name' => 'حفص عن عاصم - مرتل',
        'server' => 'https://source.example.test/fixture/',
        'surah_list' => $surahs,
        'files' => $files,
    ], $overrides);
}

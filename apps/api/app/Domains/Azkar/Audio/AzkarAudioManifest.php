<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Audio;

use App\Domains\Azkar\Exceptions\AudioException;

/**
 * The pinned OpenDua audio manifest (ADR 0040, step 14). The file is checked against its SHA-256 pin before any use.
 * Only shipped tracks are returned: a track whose entry is in config azkar.excluded_entries is not shipped, so it is
 * never downloaded, imported or served.
 */
final class AzkarAudioManifest
{
    /** @var array<string, array{shipped: list<AzkarAudioTrack>, byName: array<string, AzkarAudioTrack>}> */
    private static array $loaded = [];

    /**
     * @return list<AzkarAudioTrack> Shipped tracks, in manifest order.
     *
     * @throws AudioException
     */
    public function shipped(): array
    {
        return $this->load()['shipped'];
    }

    /**
     * The shipped track with this file name, or null (also for an excluded entry's file).
     *
     * @throws AudioException
     */
    public function track(string $name): ?AzkarAudioTrack
    {
        return $this->load()['byName'][$name] ?? null;
    }

    /**
     * @return array{shipped: list<AzkarAudioTrack>, byName: array<string, AzkarAudioTrack>}
     *
     * @throws AudioException
     */
    private function load(): array
    {
        $path = (string) config('azkar.audio.manifest_path');
        $pin = (string) config('azkar.audio.manifest_sha256');
        $collection = (string) config('azkar.opendua.collection_id');
        $excluded = array_keys((array) config('azkar.excluded_entries', []));
        $cacheKey = implode('|', [$path, $pin, $collection, implode(',', $excluded), (string) config('azkar.audio_version')]);

        if (isset(self::$loaded[$cacheKey])) {
            return self::$loaded[$cacheKey];
        }

        $bytes = is_file($path) ? file_get_contents($path) : false;

        if ($bytes === false) {
            throw new AudioException('The Azkar audio manifest is missing: '.$path);
        }

        if ($pin === '' || ! hash_equals($pin, hash('sha256', $bytes))) {
            throw new AudioException('The Azkar audio manifest does not match azkar.audio.manifest_sha256 (ADR 0040).');
        }

        try {
            $data = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new AudioException('The Azkar audio manifest is not valid JSON.');
        }

        if (! is_array($data) || ($data['version'] ?? null) !== config('azkar.audio_version') || ! is_array($data['tracks'] ?? null)) {
            throw new AudioException('The Azkar audio manifest is not the configured version.');
        }

        $shipped = [];
        $byName = [];

        foreach ($data['tracks'] as $raw) {
            $track = $this->parseTrack($raw, $collection, $excluded);

            if ($track === null) {
                continue;
            }

            if (isset($byName[$track->name])) {
                throw new AudioException('The Azkar audio manifest lists a file twice.');
            }

            $shipped[] = $track;
            $byName[$track->name] = $track;
        }

        self::$loaded[$cacheKey] = ['shipped' => $shipped, 'byName' => $byName];

        return self::$loaded[$cacheKey];
    }

    /**
     * @param  list<string>  $excluded
     *
     * @throws AudioException
     */
    private function parseTrack(mixed $raw, string $collection, array $excluded): ?AzkarAudioTrack
    {
        if (! is_array($raw) || ! is_string($raw['entryId'] ?? null) || ! is_string($raw['key'] ?? null)
            || ! is_int($raw['bytes'] ?? null) || ! is_string($raw['sha256'] ?? null) || ! is_int($raw['durationSeconds'] ?? null)) {
            throw new AudioException('The Azkar audio manifest holds a track without its fields.');
        }

        if (preg_match('/^OD-(\d{3})$/', $raw['entryId'], $matches) !== 1) {
            throw new AudioException('The Azkar audio manifest holds an unexpected entry id.');
        }

        $entryKey = $collection.':entry-'.str_pad($matches[1], 6, '0', STR_PAD_LEFT);

        if (in_array($entryKey, $excluded, true)) {
            return null;
        }

        $name = basename($raw['key']);

        if (! preg_match(AzkarAudioFiles::NAME_PATTERN, $name) || $raw['bytes'] < 0 || preg_match('/^[0-9a-f]{64}$/', $raw['sha256']) !== 1) {
            throw new AudioException('The Azkar audio manifest holds a track with an unexpected name, size or hash.');
        }

        return new AzkarAudioTrack(
            name: $name,
            key: $raw['key'],
            entryKey: $entryKey,
            bytes: $raw['bytes'],
            sha256: $raw['sha256'],
            durationSeconds: $raw['durationSeconds'],
        );
    }
}

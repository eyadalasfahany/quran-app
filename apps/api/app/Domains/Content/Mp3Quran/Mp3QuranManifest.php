<?php

declare(strict_types=1);

namespace App\Domains\Content\Mp3Quran;

use App\Support\QuranText\ChapterVerseCounts;
use JsonException;

/**
 * Reads and validates the committed MP3Quran manifest (ADR 0061 decision 8). A damaged file refuses the whole run; a
 * damaged moshaf is listed in the result's `invalid` and skipped, so its stored rows are never half-imported.
 */
final class Mp3QuranManifest
{
    private const int SCHEMA = 1;

    private const int MIN_RANGE_AYAHS = 3;

    private readonly ReciterSource $source;

    public function __construct(?ReciterSource $source = null)
    {
        $this->source = $source ?? ReciterSource::mp3quran();
    }

    /**
     * @throws Mp3QuranManifestException when the whole manifest is refused
     */
    public function load(string $path): Mp3QuranManifestData
    {
        $bytes = is_file($path) ? file_get_contents($path) : false;

        if ($bytes === false) {
            throw new Mp3QuranManifestException('The MP3Quran manifest is missing: '.$path);
        }

        try {
            $data = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new Mp3QuranManifestException('The MP3Quran manifest is not valid JSON.');
        }

        if (! is_array($data) || ($data['schema'] ?? null) !== self::SCHEMA || ($data['source'] ?? null) !== $this->source->manifestSource) {
            throw new Mp3QuranManifestException('The MP3Quran manifest has the wrong schema or source.');
        }

        $publicBase = $data['public_base'] ?? null;

        if (! is_string($publicBase) || ! str_starts_with($publicBase, 'https://') || str_ends_with($publicBase, '/')) {
            throw new Mp3QuranManifestException('The MP3Quran manifest public_base must be an https URL without a trailing slash.');
        }

        $rawMoshafs = $data['moshafs'] ?? null;

        if (! is_array($rawMoshafs) || ! array_is_list($rawMoshafs) || $rawMoshafs === []) {
            throw new Mp3QuranManifestException('The MP3Quran manifest has no moshafs.');
        }

        $counts = array_count_values(array_filter(
            array_map(static fn (mixed $raw): mixed => is_array($raw) ? ($raw['moshaf_id'] ?? null) : null, $rawMoshafs),
            is_int(...),
        ));

        $moshafs = [];
        $invalid = [];

        foreach ($rawMoshafs as $raw) {
            $id = is_array($raw) && is_int($raw['moshaf_id'] ?? null) ? $raw['moshaf_id'] : null;

            if ($id !== null && ($counts[$id] ?? 0) > 1) {
                $invalid[] = ['moshaf_id' => $id, 'reason' => 'moshaf_id is repeated'];

                continue;
            }

            $parsed = $this->parseMoshaf($raw, $publicBase);

            if ($parsed instanceof Mp3QuranMoshaf) {
                $moshafs[] = $parsed;
            } else {
                $invalid[] = $parsed;
            }
        }

        return new Mp3QuranManifestData($publicBase, $moshafs, $invalid);
    }

    /**
     * @return Mp3QuranMoshaf|array{moshaf_id: int|null, reason: string}
     */
    private function parseMoshaf(mixed $raw, string $publicBase): Mp3QuranMoshaf|array
    {
        if (! is_array($raw) || ! is_int($raw['moshaf_id'] ?? null) || $raw['moshaf_id'] < 1) {
            return ['moshaf_id' => null, 'reason' => 'moshaf_id is not an int of 1 or more'];
        }

        $id = $raw['moshaf_id'];

        $nameAr = $this->nonEmptyString($raw, 'name_ar');
        $nameEn = $this->nonEmptyString($raw, 'name_en');
        $riwayah = $this->nonEmptyString($raw, 'riwayah');
        $moshafName = $this->nonEmptyString($raw, 'moshaf_name');

        if ($nameAr === null || $nameEn === null || $riwayah === null || $moshafName === null) {
            return ['moshaf_id' => $id, 'reason' => 'name_ar, name_en, riwayah or moshaf_name is missing'];
        }

        if (! in_array($riwayah, (array) config($this->source->riwayahConfig), true)) {
            return ['moshaf_id' => $id, 'reason' => 'riwayah is not a shipped riwayah'];
        }

        $rawFiles = $raw['files'] ?? null;

        if (! is_array($rawFiles) || ! array_is_list($rawFiles) || $rawFiles === []) {
            return ['moshaf_id' => $id, 'reason' => 'files is not a non-empty list'];
        }

        $files = [];
        $surahs = [];

        foreach ($rawFiles as $rawFile) {
            $file = $this->parseFile($rawFile, $id, $publicBase);

            if (is_string($file)) {
                return ['moshaf_id' => $id, 'reason' => $file];
            }

            if (isset($surahs[$file->surah])) {
                return ['moshaf_id' => $id, 'reason' => 'surah '.$file->surah.' appears twice'];
            }

            $surahs[$file->surah] = true;
            $files[] = $file;
        }

        usort($files, static fn (Mp3QuranFile $a, Mp3QuranFile $b): int => $a->surah <=> $b->surah);

        $surahList = [];

        if (is_array($raw['surah_list'] ?? null) && array_is_list($raw['surah_list'])) {
            $surahList = array_values(array_filter($raw['surah_list'], is_int(...)));
        }

        return new Mp3QuranMoshaf($id, $nameAr, $nameEn, $riwayah, $moshafName, $surahList, $files);
    }

    /**
     * @return Mp3QuranFile|string the file, or the reason it is invalid
     */
    private function parseFile(mixed $raw, int $moshafId, string $publicBase): Mp3QuranFile|string
    {
        if (! is_array($raw)) {
            return 'a file is not an object';
        }

        $surah = $raw['surah'] ?? null;
        $key = $raw['key'] ?? null;
        $url = $raw['url'] ?? null;
        $sha256 = $raw['sha256'] ?? null;
        $bytes = $raw['bytes'] ?? null;
        $durationMs = $raw['duration_ms'] ?? null;

        if (! is_int($surah) || $surah < 1 || $surah > 114) {
            return 'a file surah is not 1 to 114';
        }

        if (! is_int($bytes) || $bytes < 1) {
            return 'surah '.$surah.' bytes is not an int above 0';
        }

        if (! is_int($durationMs) || $durationMs < 1) {
            return 'surah '.$surah.' duration_ms is not an int above 0';
        }

        if (! is_string($sha256) || preg_match('/^[0-9a-f]{64}$/', $sha256) !== 1) {
            return 'surah '.$surah.' sha256 is not 64 lowercase hex characters';
        }

        $expectedKey = $this->source->keyPrefix.$moshafId.'/'.sprintf('%03d', $surah).'-'.substr($sha256, 0, 16).'.mp3';

        if ($key !== $expectedKey) {
            return 'surah '.$surah.' key does not match its sha256';
        }

        if ($url !== $publicBase.'/'.$expectedKey) {
            return 'surah '.$surah.' url is not public_base and key';
        }

        $range = $this->parseRange($raw, $surah);

        if (is_string($range)) {
            return $range;
        }

        return new Mp3QuranFile($surah, $expectedKey, $url, $sha256, $bytes, $durationMs, $range[0], $range[1]);
    }

    /**
     * The optional recorded ayah range of a partial surah (ADR 0077 amendment): both keys or neither, 1 <= first <= last
     * <= the surah's ayah count, at least 3 ayahs. Absent or null keys mean the whole surah.
     *
     * @param  array<mixed>  $raw
     * @return array{int|null, int|null}|string the range, or the reason it is invalid
     */
    private function parseRange(array $raw, int $surah): array|string
    {
        $first = $raw['first_ayah'] ?? null;
        $last = $raw['last_ayah'] ?? null;

        if ($first === null && $last === null) {
            return [null, null];
        }

        if (! is_int($first) || ! is_int($last)) {
            return 'surah '.$surah.' first_ayah and last_ayah must both be ints';
        }

        if ($first < 1 || $first > $last || $last > ChapterVerseCounts::forChapter($surah)) {
            return 'surah '.$surah.' ayah range is outside the surah';
        }

        if ($last - $first + 1 < self::MIN_RANGE_AYAHS) {
            return 'surah '.$surah.' ayah range is shorter than '.self::MIN_RANGE_AYAHS.' ayahs';
        }

        return [$first, $last];
    }

    /**
     * @param  array<mixed>  $raw
     */
    private function nonEmptyString(array $raw, string $field): ?string
    {
        $value = $raw[$field] ?? null;

        return is_string($value) && trim($value) !== '' ? $value : null;
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

use App\Domains\Hadith\Exceptions\HadithGapBuildException;
use JsonException;

/**
 * Reads the pinned Sunnah.com-derived dataset files of config hadith.datasets (ADR 0076, gap-report extension). A file is
 * read only when its SHA-256 equals the pin in config; an unpinned file is refused. Dev only: the builder is the one caller.
 */
final class HadithDatasets
{
    private const string PIN_PATTERN = '~^[0-9a-f]{64}$~';

    /**
     * The origin code of a decision's source name (for example meeAtif/hadith_datasets gives meeatif), or null for any other.
     */
    public static function originOfSource(string $source): ?string
    {
        foreach ((array) config('hadith.datasets', []) as $origin => $dataset) {
            if (is_array($dataset) && ($dataset['source'] ?? null) === $source) {
                return (string) $origin;
            }
        }

        return null;
    }

    /**
     * The decision source name of an origin code, or null when config has no such origin.
     */
    public static function sourceOfOrigin(string $origin): ?string
    {
        $dataset = config('hadith.datasets.'.$origin);

        return is_array($dataset) && is_string($dataset['source'] ?? null) ? $dataset['source'] : null;
    }

    /**
     * @throws HadithGapBuildException when the origin, the collection, the pin or the file does not match
     */
    public function load(string $origin, string $slug): HadithDatasetFile
    {
        $dataset = config('hadith.datasets.'.$origin);

        if (! is_array($dataset) || ! is_string($dataset['dir'] ?? null) || ! is_array($dataset['files'] ?? null) || ! is_array($dataset['collections'] ?? null) || ! is_array($dataset['record'] ?? null)) {
            throw new HadithGapBuildException('Config [hadith.datasets] has no complete entry for ['.$origin.'] (dataset_origin_unknown).');
        }

        $name = $dataset['collections'][$slug] ?? null;

        if (! is_string($name)) {
            throw new HadithGapBuildException('The dataset ['.$origin.'] has no file for collection ['.$slug.'] (dataset_collection_unknown).');
        }

        $pin = $dataset['files'][$name] ?? null;

        if (! is_string($pin) || preg_match(self::PIN_PATTERN, $pin) !== 1) {
            throw new HadithGapBuildException('The dataset file of ['.$origin.'] has no SHA-256 pin in config (dataset_file_unpinned).');
        }

        $path = storage_path(rtrim($dataset['dir'], '/').'/'.$name);
        $bytes = is_file($path) ? file_get_contents($path) : false;

        if ($bytes === false) {
            throw new HadithGapBuildException('The dataset file of ['.$origin.'] is missing in its folder (dataset_file_missing).');
        }

        if (! hash_equals($pin, hash('sha256', $bytes))) {
            throw new HadithGapBuildException('The dataset file of ['.$origin.'] differs from its pin in config (dataset_file_sha_mismatch).');
        }

        try {
            $data = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new HadithGapBuildException('The dataset file of ['.$origin.'] is not valid JSON (dataset_file_invalid).');
        }

        $listKey = $dataset['record']['list'] ?? null;
        $rows = $listKey === null ? $data : (is_array($data) ? ($data[$listKey] ?? null) : null);

        if (! is_array($rows) || ! array_is_list($rows)) {
            throw new HadithGapBuildException('The dataset file of ['.$origin.'] holds no record list (dataset_file_invalid).');
        }

        $textKey = is_string($dataset['record']['text'] ?? null) ? $dataset['record']['text'] : '';
        $texts = [];

        foreach ($rows as $row) {
            $text = is_array($row) ? ($row[$textKey] ?? null) : null;
            $texts[] = is_string($text) ? $text : '';
        }

        return new HadithDatasetFile(name: $name, sha256: $pin, texts: $texts);
    }
}

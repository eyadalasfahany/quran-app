<?php

declare(strict_types=1);

namespace App\Domains\Content\Mp3Quran;

/**
 * The per-source values the MP3Quran manifest parser, file-id scheme and importer read (ADR 0061, ADR 0074 decision 5).
 * `mp3quran()` holds exactly the values those classes used before the profile existed. Config values are read by the
 * key names held here, so a source's settings stay in config/quran.php.
 *
 * The hide rule (which reciters import inactive) is one of two shapes, chosen by `releasedConfig`:
 * - null: MP3Quran's rule. A moshaf listed in the duplicates config is hidden (reason duplicate_of_qf:N), and one
 *   listed in the held config is hidden (reason held).
 * - set: Way2Quran's rule (ADR 0074 decision 8). Every reciter is hidden (reason held) unless its id is listed under
 *   this config key. No duplicates or held list applies, so those keys are null.
 */
final readonly class ReciterSource
{
    public const int MP3QURAN_FILE_ID_BASE = 1_000_000_000;

    public const int WAY2QURAN_FILE_ID_BASE = 2_000_000_000;

    public function __construct(
        public string $contentSource,
        public string $manifestSource,
        public string $keyPrefix,
        public int $fileIdBase,
        public string $manifestPathConfig,
        public ?string $duplicatesConfig,
        public ?string $heldMoshafsConfig,
        public string $riwayahConfig,
        public ?string $releasedConfig = null,
    ) {}

    public static function mp3quran(): self
    {
        return new self(
            contentSource: 'mp3quran',
            manifestSource: 'mp3quran',
            keyPrefix: 'audio/mp3quran/',
            fileIdBase: self::MP3QURAN_FILE_ID_BASE,
            manifestPathConfig: 'quran.mp3quran_manifest_path',
            duplicatesConfig: 'quran.mp3quran_duplicates',
            heldMoshafsConfig: 'quran.mp3quran_held_moshafs',
            riwayahConfig: 'quran.mp3quran_riwayat',
        );
    }

    public static function way2quran(): self
    {
        return new self(
            contentSource: 'way2quran',
            manifestSource: 'way2quran',
            keyPrefix: 'audio/way2quran/',
            fileIdBase: self::WAY2QURAN_FILE_ID_BASE,
            manifestPathConfig: 'quran.way2quran_manifest_path',
            duplicatesConfig: null,
            heldMoshafsConfig: null,
            riwayahConfig: 'quran.mp3quran_riwayat',
            releasedConfig: 'quran.way2quran_released_reciters',
        );
    }
}

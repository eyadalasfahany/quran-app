<?php

declare(strict_types=1);

namespace App\Domains\Content\Mp3Quran;

/**
 * The per-source values the MP3Quran manifest parser, file-id scheme and importer read (ADR 0061, ADR 0074 decision 5).
 * `mp3quran()` holds exactly the values those classes used before the profile existed. Config values are read by the
 * key names held here, so a source's settings stay in config/quran.php.
 */
final readonly class ReciterSource
{
    public const int MP3QURAN_FILE_ID_BASE = 1_000_000_000;

    public function __construct(
        public string $contentSource,
        public string $manifestSource,
        public string $keyPrefix,
        public int $fileIdBase,
        public string $manifestPathConfig,
        public string $duplicatesConfig,
        public string $heldMoshafsConfig,
        public string $riwayahConfig,
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
}

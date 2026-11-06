<?php

declare(strict_types=1);

use App\Domains\Content\Mp3Quran\Mp3QuranFileId;
use App\Domains\Content\Mp3Quran\ReciterSource;

it('holds exactly the mp3quran values the parser, file ids and importer used before the profile', function (): void {
    $source = ReciterSource::mp3quran();

    expect($source->contentSource)->toBe('mp3quran')
        ->and($source->manifestSource)->toBe('mp3quran')
        ->and($source->keyPrefix)->toBe('audio/mp3quran/')
        ->and($source->fileIdBase)->toBe(1_000_000_000)
        ->and($source->manifestPathConfig)->toBe('quran.mp3quran_manifest_path')
        ->and($source->duplicatesConfig)->toBe('quran.mp3quran_duplicates')
        ->and($source->heldMoshafsConfig)->toBe('quran.mp3quran_held_moshafs')
        ->and($source->riwayahConfig)->toBe('quran.mp3quran_riwayat');
});

it('keeps the mp3quran file-id base equal to the profile base', function (): void {
    expect(Mp3QuranFileId::BASE)->toBe(1_000_000_000)
        ->and(ReciterSource::MP3QURAN_FILE_ID_BASE)->toBe(Mp3QuranFileId::BASE);
});

it('gives the same file ids with the default profile as before the refactor', function (): void {
    expect(Mp3QuranFileId::for(253, 59))->toBe(1_000_253_059)
        ->and(Mp3QuranFileId::for(253, 1))->toBe(1_000_253_001)
        ->and(Mp3QuranFileId::for(1, 114))->toBe(1_000_001_114)
        ->and(Mp3QuranFileId::for(86, 2))->toBe(1_000_086_002);
});

it('gives the same file ids when the mp3quran profile is passed explicitly', function (): void {
    $source = ReciterSource::mp3quran();

    expect(Mp3QuranFileId::for(253, 59, $source))->toBe(Mp3QuranFileId::for(253, 59))
        ->and(Mp3QuranFileId::for(86, 2, $source))->toBe(1_000_086_002);
});

it('takes the id base from the profile it is given', function (): void {
    $other = new ReciterSource(
        contentSource: 'other',
        manifestSource: 'other',
        keyPrefix: 'audio/other/',
        fileIdBase: 2_000_000_000,
        manifestPathConfig: 'quran.other_manifest_path',
        duplicatesConfig: 'quran.other_duplicates',
        heldMoshafsConfig: 'quran.other_held_moshafs',
        riwayahConfig: 'quran.other_riwayat',
    );

    expect(Mp3QuranFileId::for(253, 59, $other))->toBe(2_000_253_059);
});

<?php

declare(strict_types=1);

use App\Support\QuranText\AyahChecksum;
use App\Support\QuranText\QuranTextException;
use App\Support\QuranText\TanzilReader;
use Tests\TestCase;

uses(TestCase::class);

it('matches the pinned uthmani checksum for the tanzil file', function (): void {
    expect(AyahChecksum::compute((new TanzilReader)->texts()))
        ->toBe('32cc746d817cad9fd4366c7597bfceb177e7649233616c0a80309074b2eb99ee');
});

it('matches the shared checksum for a and b', function (): void {
    expect(AyahChecksum::compute(['a', 'b']))
        ->toBe('7e18f737311b2dc3b2f269dd78396b0351f14fb66efa879f768cb23181883c78');
});

it('keeps text after the second pipe', function (): void {
    expect(TanzilReader::textsFrom("1|1|left|right|tail\n"))->toBe(['left|right|tail']);
});

it('rejects a line without a verse separator', function (): void {
    TanzilReader::textsFrom("1|1\n");
})->throws(QuranTextException::class, 'A Tanzil line does not have sura, ayah and text separators.');

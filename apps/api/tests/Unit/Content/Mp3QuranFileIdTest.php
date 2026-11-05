<?php

declare(strict_types=1);

use App\Domains\Content\Mp3Quran\Mp3QuranFileId;

it('puts moshaf and surah in the reserved range', function (): void {
    expect(Mp3QuranFileId::for(253, 59))->toBe(1_000_253_059)
        ->and(Mp3QuranFileId::for(253, 1))->toBe(1_000_253_001);
});

it('rejects a surah outside 1 to 114', function (): void {
    expect(fn () => Mp3QuranFileId::for(253, 0))->toThrow(InvalidArgumentException::class)
        ->and(fn () => Mp3QuranFileId::for(253, 115))->toThrow(InvalidArgumentException::class);
});

it('rejects a moshaf id below 1', function (): void {
    expect(fn () => Mp3QuranFileId::for(0, 1))->toThrow(InvalidArgumentException::class);
});

it('never collides with a QF record id', function (): void {
    expect(Mp3QuranFileId::for(1, 1))->toBeGreaterThan(1_000_000_000)
        ->and(Mp3QuranFileId::for(1, 1))->toBeGreaterThan(Mp3QuranFileId::BASE);
});

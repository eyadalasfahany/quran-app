<?php

declare(strict_types=1);

use App\Domains\Azkar\Exceptions\ReligiousTextIntegrityException;
use App\Domains\Azkar\Services\QuranSegmenter;
use App\Support\QuranText\SearchTextNormalizer;

/*
| Placeholder text only: «نص تجريبي» stands in for any Arabic. ADR 0031 §4.
*/

function azkarSegmenter(): QuranSegmenter
{
    return new QuranSegmenter(new SearchTextNormalizer);
}

it('splits at each span and keeps the text outside byte for byte, surrounding spaces included', function (): void {
    $text = " «نص» \u{FD3F}نص تجريبي\u{FD3E} «نص» ";
    $scan = azkarSegmenter()->scan($text);

    expect($scan['balanced'])->toBeTrue()
        ->and($scan['spans'])->toBe(1)
        ->and($scan['pieces'])->toBe([
            ['kind' => 'text', 'text' => ' «نص» '],
            ['kind' => 'quran', 'text' => 'نص تجريبي'],
            ['kind' => 'text', 'text' => ' «نص» '],
        ]);
});

it('marks unbalanced or nested spans as not balanced', function (string $text): void {
    expect(azkarSegmenter()->scan($text)['balanced'])->toBeFalse();
})->with([
    'opening without closing' => ["\u{FD3F}نص"],
    'closing without opening' => ["نص\u{FD3E}"],
    'nested opening' => ["\u{FD3F}نص \u{FD3F}نص\u{FD3E}\u{FD3E}"],
    'empty span' => ["\u{FD3F}\u{FD3E}"],
]);

it('segments in span order, mapping each span to its reviewed reference', function (): void {
    $text = "«نص» \u{FD3F}نص تجريبي\u{FD3E} «نص» \u{FD3F}نص تجريبي\u{FD3E}";
    $segments = azkarSegmenter()->segment($text, [[1, 1, 7], [2, 1, null]]);

    expect(array_column($segments, 'kind'))->toBe(['text', 'quran', 'text', 'quran'])
        ->and(array_column($segments, 'position'))->toBe([1, 2, 3, 4])
        ->and($segments[1])->toMatchArray(['quran_surah' => 1, 'quran_verse_from' => 1, 'quran_verse_to' => 7, 'text_ar' => null])
        ->and($segments[3])->toMatchArray(['quran_surah' => 2, 'quran_verse_from' => 1, 'quran_verse_to' => null])
        ->and($segments[0]['text_ar'])->toBe('«نص» ');
});

it('refuses to segment when the references do not match the spans', function (): void {
    expect(fn () => azkarSegmenter()->segment("\u{FD3F}نص\u{FD3E} \u{FD3F}نص\u{FD3E}", [[1, 1, null]]))
        ->toThrow(ReligiousTextIntegrityException::class);
});

it('a text without spans is one text segment, byte for byte', function (): void {
    $segments = azkarSegmenter()->segment('  «نص»  ', []);

    expect($segments)->toHaveCount(1)
        ->and($segments[0]['text_ar'])->toBe('  «نص»  ');
});

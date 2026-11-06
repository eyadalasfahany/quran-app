<?php

declare(strict_types=1);

use App\Support\HadithText\HadithSearchTextNormalizer;
use App\Support\QuranText\SearchTextNormalizer;

/**
 * @return list<array{name: string, input: string, expected: string}>
 */
function hadithNormaliserGoldenCases(): array
{
    $raw = file_get_contents(__DIR__.'/../../Fixtures/hadith/search-normalizer.json');
    expect($raw)->toBeString();

    /** @var array{cases: list<array{name: string, input: string, expected: string}>} $decoded */
    $decoded = json_decode((string) $raw, true, 512, JSON_THROW_ON_ERROR);

    return $decoded['cases'];
}

/**
 * @return list<int>
 */
function hadithNormaliserCodePoints(int ...$ranges): array
{
    $codePoints = [];

    for ($index = 0; $index < count($ranges); $index += 2) {
        for ($codePoint = $ranges[$index]; $codePoint <= $ranges[$index + 1]; $codePoint++) {
            $codePoints[] = $codePoint;
        }
    }

    return $codePoints;
}

it('matches the golden fixture', function (): void {
    $cases = hadithNormaliserGoldenCases();

    expect(count($cases))->toBeGreaterThanOrEqual(26);

    foreach ($cases as $case) {
        expect((new HadithSearchTextNormalizer)->normalize($case['input']))
            ->toBe($case['expected'], 'case: '.$case['name']);
    }
});

it('is idempotent on every golden case', function (): void {
    foreach (hadithNormaliserGoldenCases() as $case) {
        expect((new HadithSearchTextNormalizer)->normalize($case['expected']))
            ->toBe($case['expected'], 'case: '.$case['name']);
    }
});

it('strips every code point of the documented sets', function (): void {
    $codePoints = hadithNormaliserCodePoints(
        0x200B, 0x200F,
        0x061C, 0x061C,
        0x202A, 0x202E,
        0x2066, 0x2069,
        0xFEFF, 0xFEFF,
        0x0640, 0x0640,
        0x064B, 0x065F,
        0x0670, 0x0670,
        0x06D6, 0x06ED,
    );

    foreach ($codePoints as $codePoint) {
        expect((new HadithSearchTextNormalizer)->normalize("\u{0628}".mb_chr($codePoint)."\u{062A}"))
            ->toBe("\u{0628}\u{062A}", 'code point: '.dechex($codePoint));
    }
});

it('maps exactly six code points and leaves hamza seats alone', function (): void {
    $maps = [
        0x0622 => 0x0627,
        0x0623 => 0x0627,
        0x0625 => 0x0627,
        0x0671 => 0x0627,
        0x0629 => 0x0647,
        0x0649 => 0x064A,
    ];

    foreach ($maps as $source => $target) {
        expect((new HadithSearchTextNormalizer)->normalize(mb_chr($source)))->toBe(mb_chr($target));
    }

    expect((new HadithSearchTextNormalizer)->normalize("\u{0624}"))->toBe("\u{0624}")
        ->and((new HadithSearchTextNormalizer)->normalize("\u{0626}"))->toBe("\u{0626}");
});

it('treats the explicit whitespace set as whitespace and nothing else', function (): void {
    $whitespace = hadithNormaliserCodePoints(
        0x0009, 0x000D,
        0x0020, 0x0020,
        0x00A0, 0x00A0,
        0x1680, 0x1680,
        0x2000, 0x200A,
        0x2028, 0x2029,
        0x202F, 0x202F,
        0x205F, 0x205F,
        0x3000, 0x3000,
    );

    foreach ($whitespace as $codePoint) {
        expect((new HadithSearchTextNormalizer)->normalize("\u{0628}".mb_chr($codePoint)."\u{062A}"))
            ->toBe("\u{0628} \u{062A}", 'code point: '.dechex($codePoint));
    }

    expect((new HadithSearchTextNormalizer)->normalize("\u{0628}\u{0085}\u{062A}"))->toBe("\u{0628}\u{0085}\u{062A}")
        ->and((new HadithSearchTextNormalizer)->normalize("\u{0628}\u{2060}\u{062A}"))->toBe("\u{0628}\u{2060}\u{062A}");
});

it('throws on text that is not valid UTF-8', function (): void {
    expect(fn () => (new HadithSearchTextNormalizer)->normalize("\xC3\x28"))
        ->toThrow(UnexpectedValueException::class);
});

it('agrees with the Quran normaliser on text that has no invisible marks', function (): void {
    $cases = hadithNormaliserGoldenCases();
    $shared = [2, 3, 4, 5, 6, 9, 10, 17, 23];

    foreach ($shared as $index) {
        $input = $cases[$index - 1]['input'];

        expect((new HadithSearchTextNormalizer)->normalize($input))
            ->toBe((new SearchTextNormalizer)->normalize($input), 'case: '.$cases[$index - 1]['name']);
    }

    // The two normalisers differ on a mark: the Quran one keeps U+200F, the hadith one removes it.
    expect((new SearchTextNormalizer)->normalize("\u{0628}\u{200F}"))->toBe("\u{0628}\u{200F}")
        ->and((new HadithSearchTextNormalizer)->normalize("\u{0628}\u{200F}"))->toBe("\u{0628}");
});

<?php

declare(strict_types=1);

use App\Domains\Azkar\Services\QuranReferenceCandidates;
use App\Domains\Azkar\Services\QuranSpanMatcher;
use App\Support\QuranText\QuranWordMap;
use App\Support\QuranText\SearchTextNormalizer;

/*
| ADR 0093: an unmatched span that is one exact run of words becomes a candidate row with its word pair; a span in several
| runs stays unmatched and says so. The span text is built here at run time from the word map (the Tanzil seed), by
| position. Nothing Quran is typed in this file.
*/

const QWC_ITEM = 'hisn-al-muslim:entry-000004:evening:1';

/**
 * The fixture catalogue with the first item of QWC_ITEM replaced by one span holding $arabic.
 *
 * @return array<string, mixed>
 */
function qwcCatalogue(string $arabic): array
{
    $catalogue = json_decode((string) file_get_contents(base_path('tests/Fixtures/azkar/opendua-fixture.json')), true, flags: JSON_THROW_ON_ERROR);

    foreach ($catalogue['entries'] as $entryIndex => $entry) {
        if (($entry['id'] ?? null) !== 'entry-000004') {
            continue;
        }

        foreach ($entry['variations'] as $variationIndex => $variation) {
            if (($variation['id'] ?? null) === 'evening') {
                $catalogue['entries'][$entryIndex]['variations'][$variationIndex]['steps'][0]['items'][0]['dua']['arabic'] = $arabic;
            }
        }
    }

    return $catalogue;
}

/**
 * The words of one verse from the word map, from position $from to $to, joined by one space as the seed does.
 */
function qwcWordsSpan(int $surah, int $ayah, int $from, int $to): string
{
    $words = (new QuranWordMap)->words($surah, $ayah);

    return implode(' ', array_slice((array) $words, $from - 1, $to - $from + 1));
}

function qwcBuild(string $arabic): array
{
    $matcher = QuranSpanMatcher::fromTanzilFiles(QuranSpanMatcher::uthmaniPath(), QuranSpanMatcher::simplePath(), new SearchTextNormalizer);

    return app(QuranReferenceCandidates::class)->build(qwcCatalogue($arabic), [], $matcher, 'hisn-al-muslim');
}

it('turns an exact run of words into a candidate row with its word pair', function (): void {
    $span = qwcWordsSpan(2, 158, 1, 6);

    $result = qwcBuild("\u{FD3F}".$span."\u{FD3E}");

    expect($result['rows'][QWC_ITEM][0])->toBe([
        2, 158, null, 'status' => 'candidate', 'evidence' => 'words:exact', 'words' => [1, 6],
    ])
        ->and($result['stats']['words_exact'])->toBe(1)
        ->and($result['items'][QWC_ITEM]['candidate'])->toBe(1);
});

it('keeps a span that is in no run unmatched, with the matcher row and no word pair', function (): void {
    $result = qwcBuild("\u{FD3F}نص تجريبي غير موجود\u{FD3E}");

    expect($result['rows'][QWC_ITEM][0]['status'])->toBe('unmatched')
        ->and($result['rows'][QWC_ITEM][0])->not->toHaveKey('words')
        ->and($result['stats']['words_exact'])->toBe(0);
});

it('keeps a span in several runs unmatched, and its evidence counts the runs', function (): void {
    $word = (string) ((new QuranWordMap)->words(2, 1)[0] ?? '');

    $result = qwcBuild("\u{FD3F}".$word."\u{FD3E}");

    expect($result['rows'][QWC_ITEM][0]['status'])->toBe('unmatched')
        ->and($result['rows'][QWC_ITEM][0]['evidence'])->toStartWith('words:ambiguous:')
        ->and($result['stats']['words_ambiguous'])->toBe(1);
});

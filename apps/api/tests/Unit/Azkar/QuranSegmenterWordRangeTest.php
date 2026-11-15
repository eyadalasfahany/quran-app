<?php

declare(strict_types=1);

use App\Domains\Azkar\Services\QuranSegmenter;
use App\Support\QuranText\SearchTextNormalizer;

/*
| ADR 0093: a segment carries its word pair. Whole-verse segments and text segments carry null, exactly as before.
| Placeholder text only («نص تجريبي» stands for any Arabic).
*/

it('emits the word pair on a partial quran segment, and null on text and whole-verse segments', function (): void {
    $segmenter = new QuranSegmenter(new SearchTextNormalizer);
    $text = "«نص» \u{FD3F}نص تجريبي\u{FD3E} «نص» \u{FD3F}نص تجريبي\u{FD3E}";

    $segments = $segmenter->segment($text, [[[2, 158, null, [1, 6]]], [[1, 1, 7]]]);

    expect($segments[0])->toMatchArray(['kind' => 'text', 'word_from' => null, 'word_to' => null])
        ->and($segments[1])->toMatchArray(['kind' => 'quran', 'quran_surah' => 2, 'quran_verse_from' => 158, 'quran_verse_to' => null, 'word_from' => 1, 'word_to' => 6])
        ->and($segments[3])->toMatchArray(['kind' => 'quran', 'quran_surah' => 1, 'quran_verse_to' => 7, 'word_from' => null, 'word_to' => null]);
});

it('stores only the numbers of a partial span: no text for the quran segment', function (): void {
    $segmenter = new QuranSegmenter(new SearchTextNormalizer);
    $segments = $segmenter->segment("\u{FD3F}نص تجريبي\u{FD3E}", [[[2, 1, null, [null, 2]]]]);

    expect($segments)->toHaveCount(1)
        ->and($segments[0]['text_ar'])->toBeNull()
        ->and($segments[0]['text_search'])->toBeNull()
        ->and($segments[0]['word_to'])->toBe(2);
});

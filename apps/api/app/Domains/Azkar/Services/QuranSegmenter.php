<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Exceptions\ReligiousTextIntegrityException;
use App\Support\QuranText\SearchTextNormalizer;

/**
 * Splits an azkar Arabic string at its ﴿…﴾ spans (ADR 0031 §4). Text outside the spans is kept byte for byte.
 * Span text is never stored: each span becomes a quran segment whose surah and verses come from the reviewed map.
 */
final class QuranSegmenter
{
    public const string OPEN = "\u{FD3F}";

    public const string CLOSE = "\u{FD3E}";

    public function __construct(
        private readonly SearchTextNormalizer $normalizer,
    ) {}

    /**
     * @return array{pieces: list<array{kind: 'text'|'quran', text: string}>, spans: int, balanced: bool}
     */
    public function scan(string $text): array
    {
        $pieces = [];
        $spans = 0;
        $balanced = true;
        $offset = 0;
        $openLength = strlen(self::OPEN);
        $closeLength = strlen(self::CLOSE);
        $length = strlen($text);

        while ($offset < $length) {
            $open = strpos($text, self::OPEN, $offset);

            if ($open === false) {
                $rest = substr($text, $offset);

                if (str_contains($rest, self::CLOSE)) {
                    $balanced = false;
                }

                $pieces[] = ['kind' => 'text', 'text' => $rest];

                break;
            }

            $before = substr($text, $offset, $open - $offset);

            if (str_contains($before, self::CLOSE)) {
                $balanced = false;
            }

            if ($before !== '') {
                $pieces[] = ['kind' => 'text', 'text' => $before];
            }

            $innerStart = $open + $openLength;
            $close = strpos($text, self::CLOSE, $innerStart);

            if ($close === false) {
                $balanced = false;
                $pieces[] = ['kind' => 'text', 'text' => substr($text, $open)];

                break;
            }

            $inner = substr($text, $innerStart, $close - $innerStart);

            if ($inner === '' || str_contains($inner, self::OPEN)) {
                $balanced = false;
            }

            $pieces[] = ['kind' => 'quran', 'text' => $inner];
            $spans++;
            $offset = $close + $closeLength;
        }

        return ['pieces' => $pieces, 'spans' => $spans, 'balanced' => $balanced];
    }

    /**
     * Segments for an item. The references list must hold one row per span, in span order.
     *
     * @param  list<array{0: int, 1: int, 2: int|null}>  $references
     * @return list<array{position: int, kind: string, text_ar: string|null, quran_surah: int|null, quran_verse_from: int|null, quran_verse_to: int|null, text_search: string|null}>
     *
     * @throws ReligiousTextIntegrityException
     */
    public function segment(string $text, array $references): array
    {
        $scan = $this->scan($text);

        if (! $scan['balanced'] || count($references) !== $scan['spans']) {
            throw new ReligiousTextIntegrityException('Quran spans do not match their reviewed references.');
        }

        $rebuilt = '';
        $segments = [];
        $spanIndex = 0;

        foreach ($scan['pieces'] as $piece) {
            $position = count($segments) + 1;

            if ($piece['kind'] === 'text') {
                $rebuilt .= $piece['text'];
                $segments[] = [
                    'position' => $position,
                    'kind' => 'text',
                    'text_ar' => $piece['text'],
                    'quran_surah' => null,
                    'quran_verse_from' => null,
                    'quran_verse_to' => null,
                    'text_search' => $this->normalizer->normalize($piece['text']),
                ];

                continue;
            }

            [$surah, $verseFrom, $verseTo] = $references[$spanIndex];
            $spanIndex++;
            $rebuilt .= self::OPEN.$piece['text'].self::CLOSE;
            $segments[] = [
                'position' => $position,
                'kind' => 'quran',
                'text_ar' => null,
                'quran_surah' => $surah,
                'quran_verse_from' => $verseFrom,
                'quran_verse_to' => $verseTo,
                'text_search' => null,
            ];
        }

        if ($rebuilt !== $text) {
            throw new ReligiousTextIntegrityException('Segments do not reassemble to the source text.');
        }

        return $segments;
    }
}

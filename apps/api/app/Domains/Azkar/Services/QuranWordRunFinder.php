<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Support\QuranText\QuranWordMap;
use App\Support\QuranText\SearchTextNormalizer;

/**
 * Finds where a quoted span is a contiguous run of Quran words inside one surah (ADR 0093). Used for a span that matches
 * no whole verse run: the dhikr quotes part of a verse.
 *
 * Both sides are normalised with the same search form (SearchTextNormalizer). A run must start on the first token of a
 * word and end on the last token of a word, so a quote never cuts a word in half. A run never crosses a surah boundary.
 * The result holds positions only, never text.
 */
final class QuranWordRunFinder
{
    /**
     * Normalised tokens of every surah, in Quran order, each with its verse, word position and word boundaries.
     *
     * @var array<int, list<array{ayah: int, position: int, text: string, wordStart: bool, wordEnd: bool}>>|null
     */
    private ?array $surahs = null;

    public function __construct(
        private readonly QuranWordMap $words,
        private readonly SearchTextNormalizer $normalizer,
    ) {}

    /**
     * Every run of words equal to the span, in Quran order. One run means the span is quoted exactly once.
     *
     * @return list<array{surah: int, verse_from: int, word_from: int, verse_to: int, word_to: int}>
     */
    public function find(string $span): array
    {
        $tokens = array_values(array_filter(
            explode(' ', $this->normalizer->normalize($span)),
            static fn (string $token): bool => $token !== '',
        ));

        if ($tokens === []) {
            return [];
        }

        $runs = [];
        $length = count($tokens);

        foreach ($this->surahTokens() as $surah => $sequence) {
            $count = count($sequence);

            for ($start = 0; $start + $length <= $count; $start++) {
                if (! $sequence[$start]['wordStart'] || $sequence[$start]['text'] !== $tokens[0]) {
                    continue;
                }

                $end = $start + $length - 1;

                if (! $sequence[$end]['wordEnd'] || ! $this->sameTokens($sequence, $start, $tokens)) {
                    continue;
                }

                $runs[] = [
                    'surah' => $surah,
                    'verse_from' => $sequence[$start]['ayah'],
                    'word_from' => $sequence[$start]['position'],
                    'verse_to' => $sequence[$end]['ayah'],
                    'word_to' => $sequence[$end]['position'],
                ];
            }
        }

        return $runs;
    }

    /**
     * @param  list<array{ayah: int, position: int, text: string, wordStart: bool, wordEnd: bool}>  $sequence
     * @param  list<string>  $tokens
     */
    private function sameTokens(array $sequence, int $start, array $tokens): bool
    {
        foreach ($tokens as $offset => $token) {
            if ($sequence[$start + $offset]['text'] !== $token) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<int, list<array{ayah: int, position: int, text: string, wordStart: bool, wordEnd: bool}>>
     */
    private function surahTokens(): array
    {
        if ($this->surahs !== null) {
            return $this->surahs;
        }

        $surahs = [];

        foreach ($this->words->verses() as $key => $verseWords) {
            [$surah, $ayah] = array_map('intval', explode(':', $key));

            foreach ($verseWords as $index => $word) {
                $tokens = array_values(array_filter(
                    explode(' ', $this->normalizer->normalize($word)),
                    static fn (string $token): bool => $token !== '',
                ));
                $last = count($tokens) - 1;

                foreach ($tokens as $tokenIndex => $token) {
                    $surahs[$surah][] = [
                        'ayah' => $ayah,
                        'position' => $index + 1,
                        'text' => $token,
                        'wordStart' => $tokenIndex === 0,
                        'wordEnd' => $tokenIndex === $last,
                    ];
                }
            }
        }

        return $this->surahs = $surahs;
    }
}

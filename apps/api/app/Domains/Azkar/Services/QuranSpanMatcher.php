<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Data\QuranSpanMatch;
use App\Domains\Azkar\Exceptions\QuranMapException;
use App\Support\QuranText\SearchTextNormalizer;
use App\Support\QuranText\TanzilReader;

/**
 * Matches one upstream ﴿…﴾ span against Taybah's bundled Tanzil text (ADR 0031 §4, §11).
 *
 * Location uses the standard-orthography Tanzil text, because OpenDua spells the words the same way. Uthmani script
 * drops letters such as the alef in «السماوات», so exact equality would never hold against it. Rendering still uses
 * the Uthmani text in content.db; this matcher never changes it.
 *
 * - exact-simple: the normalised span equals consecutive verses, possibly across surah boundaries. A basmala line may
 *   stand before the first ayah of any surah other than 1, and is counted. Several different matches are ambiguous.
 * - similarity: without an exact match, the best same-surah range by similar_text. It is a candidate at or above
 *   THRESHOLD, and unmatched below it, with the best range kept for review.
 * - check: for every located range, the Uthmani text of the same verses compared with the span, as a second signal.
 */
final class QuranSpanMatcher
{
    public const float THRESHOLD = 0.97;

    /**
     * Longest verse run tried for an exact or similarity match. Long spans in this catalogue are about 15 verses.
     */
    private const int MAX_VERSES = 60;

    /**
     * Characters of each verse's opening compared in the first, cheap stage of a similarity match.
     */
    private const int OPENING_LENGTH = 80;

    /**
     * Verse starts whose windows are scored in full by similar_text.
     */
    private const int STARTS_KEPT = 40;

    /**
     * @var list<array{surah: int, ayah: int, text: string, first: string}>
     */
    private readonly array $simple;

    /**
     * @var array<string, string> "surah:ayah" => normalised Uthmani text
     */
    private readonly array $uthmaniByKey;

    private readonly string $basmala;

    private readonly string $uthmaniBasmala;

    /**
     * @param  list<array{surah: int, ayah: int, text: string}>  $simpleVerses  Standard-orthography verses, in file order.
     * @param  list<array{surah: int, ayah: int, text: string}>  $uthmaniVerses  Uthmani verses, in file order.
     */
    public function __construct(
        private readonly SearchTextNormalizer $normalizer,
        array $simpleVerses,
        array $uthmaniVerses,
    ) {
        $simple = [];

        foreach ($simpleVerses as $verse) {
            $text = $this->normalizer->normalize($verse['text']);
            $simple[] = ['surah' => $verse['surah'], 'ayah' => $verse['ayah'], 'text' => $text, 'first' => explode(' ', $text)[0]];
        }

        $uthmani = [];

        foreach ($uthmaniVerses as $verse) {
            $uthmani[$verse['surah'].':'.$verse['ayah']] = $this->normalizer->normalize($verse['text']);
        }

        if ($simple === [] || $simple[0]['surah'] !== 1 || $simple[0]['ayah'] !== 1 || ($uthmani['1:1'] ?? null) === null) {
            throw new QuranMapException('The Tanzil text must start with 1:1, the basmala.');
        }

        $this->simple = $simple;
        $this->uthmaniByKey = $uthmani;
        $this->basmala = $simple[0]['text'];
        $this->uthmaniBasmala = $uthmani['1:1'];
    }

    /**
     * Reads the two Tanzil files in the `surah|ayah|text` format. Lines that are not verses (the licence footer) are skipped.
     */
    public static function fromTanzilFiles(string $uthmaniPath, string $simplePath, SearchTextNormalizer $normalizer): self
    {
        return new self($normalizer, self::readVerses($simplePath), self::readVerses($uthmaniPath));
    }

    /**
     * @return list<array{surah: int, ayah: int, text: string}>
     */
    public static function readVerses(string $path): array
    {
        $content = @file_get_contents($path);

        if ($content === false) {
            throw new QuranMapException('The Tanzil text cannot be read.');
        }

        $verses = [];

        foreach (explode("\n", $content) as $line) {
            if (preg_match('/^([0-9]+)\|([0-9]+)\|(.+)$/u', rtrim($line, "\r"), $matches) !== 1) {
                continue;
            }

            $verses[] = ['surah' => (int) $matches[1], 'ayah' => (int) $matches[2], 'text' => $matches[3]];
        }

        return $verses;
    }

    public static function uthmaniPath(): string
    {
        return TanzilReader::path();
    }

    public static function simplePath(): string
    {
        return TanzilReader::simplePath();
    }

    public function match(string $span): QuranSpanMatch
    {
        $text = $this->normalizer->normalize($span);

        if ($text === '') {
            return $this->unmatched('empty_span');
        }

        $located = $this->locateExact($text);

        if (count($located) > 1) {
            return $this->unmatched('ambiguous:'.count($located));
        }

        if ($located !== []) {
            $hit = $located[0];

            return $this->candidate(
                $this->rangesOf($hit['verses']),
                'exact-simple',
                $this->uthmaniCheck($text, $hit['verses']),
                $hit['basmala'],
            );
        }

        $best = $this->bestSimilarRange($text);

        if ($best === null) {
            return $this->unmatched('no_match');
        }

        $verses = [];

        for ($index = $best['start']; $index <= $best['end']; $index++) {
            $verses[] = ['surah' => $this->simple[$index]['surah'], 'ayah' => $this->simple[$index]['ayah']];
        }

        $evidence = sprintf('similarity:%.2f', $best['score']);
        $ranges = $this->rangesOf($verses);
        $check = $this->uthmaniCheck($text, $verses);

        if ($best['score'] < self::THRESHOLD) {
            return new QuranSpanMatch(QuranSpanMatch::UNMATCHED, $evidence, $ranges, $check, 0);
        }

        return $this->candidate($ranges, $evidence, $check, 0);
    }

    /**
     * Every distinct way the normalised span equals consecutive verses. A verse run may cross surah boundaries.
     *
     * @return list<array{verses: list<array{surah: int, ayah: int}>, basmala: int}>
     */
    private function locateExact(string $text): array
    {
        $found = [];

        for ($start = 0, $count = count($this->simple); $start < $count; $start++) {
            $this->walk($text, $start, 0, [], 0, $found);
        }

        $distinct = [];

        foreach ($found as $hit) {
            $distinct[json_encode($hit['verses'], JSON_THROW_ON_ERROR).'|'.$hit['basmala']] = $hit;
        }

        return array_values($distinct);
    }

    /**
     * @param  list<array{surah: int, ayah: int}>  $path
     * @param  list<array{verses: list<array{surah: int, ayah: int}>, basmala: int}>  $found
     */
    private function walk(string $text, int $index, int $position, array $path, int $basmala, array &$found): void
    {
        if ($index >= count($this->simple) || count($path) >= self::MAX_VERSES) {
            return;
        }

        $verse = $this->simple[$index];

        // A basmala line may stand before ayah 1 of any surah except 1, whose ayah 1 is the basmala itself.
        if ($verse['ayah'] === 1 && $verse['surah'] !== 1) {
            $line = $this->basmala.' ';

            if (substr_compare($text, $line, $position, strlen($line)) === 0) {
                $this->consume($text, $index, $position + strlen($line), $path, $basmala + 1, $found);
            }
        }

        $this->consume($text, $index, $position, $path, $basmala, $found);
    }

    /**
     * @param  list<array{surah: int, ayah: int}>  $path
     * @param  list<array{verses: list<array{surah: int, ayah: int}>, basmala: int}>  $found
     */
    private function consume(string $text, int $index, int $position, array $path, int $basmala, array &$found): void
    {
        $verse = $this->simple[$index];
        $length = strlen($verse['text']);

        if ($length === 0 || $position + $length > strlen($text) || substr_compare($text, $verse['text'], $position, $length) !== 0) {
            return;
        }

        $next = $position + $length;
        $path[] = ['surah' => $verse['surah'], 'ayah' => $verse['ayah']];

        if ($next === strlen($text)) {
            $found[] = ['verses' => $path, 'basmala' => $basmala];

            return;
        }

        if ($text[$next] !== ' ') {
            return;
        }

        $this->walk($text, $index + 1, $next + 1, $path, $basmala, $found);
    }

    /**
     * Consecutive verses of one surah become one range. A new range starts at each surah boundary.
     *
     * @param  list<array{surah: int, ayah: int}>  $verses
     * @return list<array{0: int, 1: int, 2: int|null}>
     */
    private function rangesOf(array $verses): array
    {
        $ranges = [];

        foreach ($verses as $verse) {
            $last = count($ranges) - 1;

            if ($last >= 0 && $ranges[$last][0] === $verse['surah'] && ($ranges[$last][2] ?? $ranges[$last][1]) + 1 === $verse['ayah']) {
                $ranges[$last][2] = $verse['ayah'];

                continue;
            }

            $ranges[] = [$verse['surah'], $verse['ayah'], null];
        }

        return $ranges;
    }

    /**
     * The Uthmani text of the located verses, compared with the span. Basmala lines are removed from both sides first.
     * Two empty texts agree completely.
     *
     * @param  list<array{surah: int, ayah: int}>  $verses
     */
    private function uthmaniCheck(string $spanText, array $verses): ?float
    {
        $joined = [];

        foreach ($verses as $verse) {
            $key = $verse['surah'].':'.$verse['ayah'];

            if (! isset($this->uthmaniByKey[$key])) {
                return null;
            }

            $joined[] = $this->uthmaniByKey[$key];
        }

        $left = $this->stripBasmala(implode(' ', $joined), $this->uthmaniBasmala);
        $right = $this->stripBasmala($spanText, $this->uthmaniBasmala);

        if ($left === '' && $right === '') {
            return 1.0;
        }

        similar_text($left, $right, $percent);

        return round($percent / 100, 2);
    }

    private function stripBasmala(string $text, string $basmala): string
    {
        return trim(str_replace($basmala, '', $text));
    }

    /**
     * Two stages. First, rank every verse by how alike its opening is to the span's opening (cheap). Then score the
     * same-surah verse windows that start at the best STARTS_KEPT verses, using their length as a filter.
     *
     * @return array{start: int, end: int, score: float}|null
     */
    private function bestSimilarRange(string $text): ?array
    {
        $length = strlen($text);
        $opening = substr($text, 0, self::OPENING_LENGTH);
        $openings = [];

        // Each verse opening is cut to the span's opening length, so a short span is not diluted by a long verse.
        foreach ($this->simple as $start => $verse) {
            similar_text(substr($verse['text'], 0, strlen($opening)), $opening, $percent);
            $openings[$start] = $percent;
        }

        arsort($openings);
        $best = null;

        foreach (array_slice(array_keys($openings), 0, self::STARTS_KEPT) as $start) {
            $verse = $this->simple[$start];
            $joined = $verse['text'];
            $limit = min(count($this->simple), $start + self::MAX_VERSES);

            for ($end = $start; $end < $limit; $end++) {
                if ($end > $start) {
                    if ($this->simple[$end]['surah'] !== $verse['surah']) {
                        break;
                    }

                    $joined .= ' '.$this->simple[$end]['text'];
                }

                // A single verse is always scored, even when it is longer than the span.
                if ($end > $start && strlen($joined) > $length * 1.2 + 20) {
                    break;
                }

                if ($end > $start && strlen($joined) < $length * 0.8 - 20) {
                    continue;
                }

                similar_text($joined, $text, $percent);

                if ($best === null || $percent / 100 > $best['score']) {
                    $best = ['start' => $start, 'end' => $end, 'score' => round($percent / 100, 2)];
                }
            }
        }

        return $best;
    }

    /**
     * @param  list<array{0: int, 1: int, 2: int|null}>  $ranges
     */
    private function candidate(array $ranges, string $evidence, ?float $check, int $basmala): QuranSpanMatch
    {
        return new QuranSpanMatch(QuranSpanMatch::CANDIDATE, $evidence, $ranges, $check, $basmala);
    }

    private function unmatched(string $evidence): QuranSpanMatch
    {
        return new QuranSpanMatch(QuranSpanMatch::UNMATCHED, $evidence, [], null, 0);
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Authoring;

use App\Domains\Seerah\Canonical\CanonicalBook;

/**
 * The place candidates of the book (`seerah:place-candidates`): the seed names found in the text and the words that follow the cue
 * words («إلى», «من», «ب»), each with its count and the first paragraphs it occurs in. Deterministic: sorted by count, then by name.
 */
final class PlaceCandidates
{
    /**
     * @return list<array{source: string, name: string, count: int, paragraphs: list<string>}>
     */
    public function find(CanonicalBook $book, int $limit = 60): array
    {
        $counts = [];
        $paragraphsOf = [];
        $surfaces = [];
        $cues = array_map(SearchText::normalise(...), SeedPlaces::CUE_WORDS);
        $seeds = array_map(SearchText::normalise(...), SeedPlaces::NAMES);
        $keyOf = static fn (string $word): string => SearchText::normalise((string) preg_replace('/[\p{P}\p{S}]+/u', '', $word));

        foreach ($book->paragraphs as $paragraph) {
            preg_match_all('/\S+/u', $paragraph->text, $matches);
            $tokens = $matches[0];

            foreach ($tokens as $index => $token) {
                $key = $keyOf($token);

                if (in_array($key, $seeds, true)) {
                    $this->add($counts, $paragraphsOf, 'seed', $key, $paragraph->id);
                    $surfaces['seed'."\t".$key] ??= $this->surface($token);
                }

                if ($index > 0 && in_array($keyOf($tokens[$index - 1]), $cues, true) && $key !== '') {
                    $this->add($counts, $paragraphsOf, 'cue', $key, $paragraph->id);
                    $surfaces['cue'."\t".$key] ??= $this->surface($token);
                }
            }
        }

        $rows = [];

        foreach ($counts as $composite => $count) {
            [$source, $name] = explode("\t", $composite, 2);
            $rows[] = [
                'source' => $source,
                'name' => $surfaces[$composite] ?? $name,
                'count' => $count,
                'paragraphs' => array_slice($paragraphsOf[$composite], 0, 5),
            ];
        }

        usort($rows, static fn (array $a, array $b): int => [$b['count'], $a['source'], $a['name']] <=> [$a['count'], $b['source'], $b['name']]);

        return array_slice($rows, 0, $limit);
    }

    /**
     * The word as the book spells it (without its punctuation).
     */
    private function surface(string $token): string
    {
        return (string) preg_replace('/[\p{P}\p{S}]+/u', '', $token);
    }

    /**
     * @param  array<string, int>  $counts
     * @param  array<string, list<string>>  $paragraphsOf
     */
    private function add(array &$counts, array &$paragraphsOf, string $source, string $name, string $paragraph): void
    {
        $composite = $source."\t".$name;
        $counts[$composite] = ($counts[$composite] ?? 0) + 1;

        if (! isset($paragraphsOf[$composite]) || ! in_array($paragraph, $paragraphsOf[$composite], true)) {
            $paragraphsOf[$composite][] = $paragraph;
        }
    }
}

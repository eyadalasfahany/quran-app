<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\WordBoxes;

use App\Domains\Mushaf\Exceptions\SvgMushafSourceException;
use JsonException;

/**
 * The reviewer's corrections for lines the split gets wrong (ADR 0090, W8). Keyed "page:line"; each entry names the line's
 * contour count, the contour indices of each word left to right (in LineOrder's normalized order, as the review sheet shows
 * them), the contours that belong to no word (`loose`: a mark of a neighbouring line, the hizb ornament) and the reason. Lines
 * the review could not settle go under `needs_developer`, keyed the same way, with a note. A word quran-text puts on a different
 * line from the artwork goes under `word_lines`, keyed "surah:ayah:position": its page, the line quran-text gives, the line the
 * artwork draws it on and the reason. A missing file means no corrections.
 *
 * @phpstan-type Override array{contours: int, groups: list<list<int>>, loose: list<int>, reason: string}
 * @phpstan-type WordLine array{page: int, from: int, to: int, reason: string}
 */
final readonly class WordBoxOverrides
{
    /**
     * @param  array<string, Override>  $lines
     * @param  array<string, string>  $needsDeveloper  "page:line" => why the review left the line to the developer
     * @param  array<string, WordLine>  $wordLines  "surah:ayah:position" => the line the artwork draws the word on
     */
    public function __construct(public array $lines = [], public array $needsDeveloper = [], public array $wordLines = []) {}

    /**
     * @throws SvgMushafSourceException when the file is malformed
     */
    public static function fromFile(string $path): self
    {
        if (! is_file($path)) {
            return new self;
        }

        try {
            $decoded = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new SvgMushafSourceException('The word-box overrides file is not valid JSON.');
        }

        $entries = is_array($decoded) ? ($decoded['overrides'] ?? null) : null;

        if (! is_array($entries)) {
            throw new SvgMushafSourceException('The word-box overrides file has no "overrides" object.');
        }

        $lines = [];

        foreach ($entries as $key => $entry) {
            $groups = is_array($entry) ? ($entry['groups'] ?? null) : null;

            if (preg_match('/^\d+:\d+$/', (string) $key) !== 1
                || ! is_array($entry)
                || ! is_int($entry['contours'] ?? null)
                || ! is_string($entry['reason'] ?? null) || trim($entry['reason']) === ''
                || ! is_array($groups) || ! array_is_list($groups) || $groups === []
            ) {
                throw new SvgMushafSourceException('The word-box override ['.$key.'] needs "contours", "groups" and a "reason".');
            }

            $seen = [];
            $clean = [];

            foreach ($groups as $group) {
                if (! is_array($group) || ! array_is_list($group) || $group === []) {
                    throw new SvgMushafSourceException('The word-box override ['.$key.'] has an empty or malformed group.');
                }

                $indexes = [];

                foreach ($group as $index) {
                    $indexes[] = self::claim($seen, $index, $entry['contours'], (string) $key);
                }

                $clean[] = $indexes;
            }

            $looseEntry = $entry['loose'] ?? [];

            if (! is_array($looseEntry) || ! array_is_list($looseEntry)) {
                throw new SvgMushafSourceException('The word-box override ['.$key.'] has a malformed "loose" list.');
            }

            $loose = [];

            foreach ($looseEntry as $index) {
                $loose[] = self::claim($seen, $index, $entry['contours'], (string) $key);
            }

            if (count($seen) !== $entry['contours']) {
                throw new SvgMushafSourceException('The word-box override ['.$key.'] leaves contours out.');
            }

            $lines[(string) $key] = ['contours' => $entry['contours'], 'groups' => $clean, 'loose' => $loose, 'reason' => $entry['reason']];
        }

        $notes = $decoded['needs_developer'] ?? [];

        if (! is_array($notes)) {
            throw new SvgMushafSourceException('The word-box overrides file has a malformed "needs_developer" object.');
        }

        $needsDeveloper = [];

        foreach ($notes as $key => $note) {
            if (preg_match('/^\d+:\d+$/', (string) $key) !== 1 || ! is_string($note) || trim($note) === '') {
                throw new SvgMushafSourceException('The needs-developer entry ['.$key.'] needs a "page:line" key and a note.');
            }

            if (isset($lines[(string) $key])) {
                throw new SvgMushafSourceException('The line ['.$key.'] is both overridden and left to the developer.');
            }

            $needsDeveloper[(string) $key] = $note;
        }

        $moves = $decoded['word_lines'] ?? [];

        if (! is_array($moves)) {
            throw new SvgMushafSourceException('The word-box overrides file has a malformed "word_lines" object.');
        }

        $wordLines = [];

        foreach ($moves as $key => $move) {
            if (preg_match('/^\d+:\d+:\d+$/', (string) $key) !== 1
                || ! is_array($move)
                || ! is_int($move['page'] ?? null) || ! is_int($move['from'] ?? null) || ! is_int($move['to'] ?? null)
                || $move['from'] === $move['to']
                || ! is_string($move['reason'] ?? null) || trim($move['reason']) === ''
            ) {
                throw new SvgMushafSourceException('The word-line correction ['.$key.'] needs a "page", two different lines "from" and "to", and a "reason".');
            }

            $wordLines[(string) $key] = ['page' => $move['page'], 'from' => $move['from'], 'to' => $move['to'], 'reason' => $move['reason']];
        }

        return new self($lines, $needsDeveloper, $wordLines);
    }

    /**
     * Takes one contour index for a word or the loose list; each index may be used once.
     *
     * @param  array<int, true>  $seen
     *
     * @throws SvgMushafSourceException
     */
    private static function claim(array &$seen, mixed $index, int $contours, string $key): int
    {
        if (! is_int($index) || $index < 0 || $index >= $contours || isset($seen[$index])) {
            throw new SvgMushafSourceException('The word-box override ['.$key.'] must use each contour index once, from 0 to '.($contours - 1).'.');
        }

        $seen[$index] = true;

        return $index;
    }

    /**
     * @return Override|null
     */
    public function for(int $page, int $line): ?array
    {
        return $this->lines[$page.':'.$line] ?? null;
    }
}

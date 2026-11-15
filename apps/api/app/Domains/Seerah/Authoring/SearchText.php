<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Authoring;

/**
 * The search form of Arabic text, with the byte position of every character it came from, so a match can be shown in the book's own
 * text. It normalises like App\Support\HadithText\HadithSearchTextNormalizer (the same strip, map and whitespace rules; a test checks
 * the two agree). Book text is never changed: the normalised form is only used to find positions.
 */
final class SearchText
{
    /** Invisible marks, tatweel, harakat, dagger alef and the Quranic annotation marks, removed first. */
    private const string STRIPPED = '/[\x{200B}-\x{200F}\x{061C}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FEFF}\x{0640}\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}]/u';

    /** The explicit whitespace set; U+0085 and U+2060 are deliberately absent. */
    private const string WHITESPACE = '/^[\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}]$/u';

    /** @var array<string, string> */
    private const array MAPPED = [
        "\u{0622}" => "\u{0627}",
        "\u{0623}" => "\u{0627}",
        "\u{0625}" => "\u{0627}",
        "\u{0671}" => "\u{0627}",
        "\u{0629}" => "\u{0647}",
        "\u{0649}" => "\u{064A}",
    ];

    /**
     * The normalised text.
     */
    public static function normalise(string $text): string
    {
        return implode('', array_column(self::units($text), 0));
    }

    /**
     * One unit per normalised character: [normalised character, byte start, byte end] in the original text. Whitespace runs become
     * one space unit; leading and trailing spaces are dropped.
     *
     * @return list<array{string, int, int}>
     */
    public static function units(string $text): array
    {
        preg_match_all('/./us', $text, $matches, PREG_OFFSET_CAPTURE);
        $units = [];

        foreach ($matches[0] as [$character, $offset]) {
            $end = $offset + strlen($character);

            if (preg_match(self::STRIPPED, $character) === 1) {
                continue;
            }

            if (preg_match(self::WHITESPACE, $character) === 1) {
                $last = $units === [] ? null : $units[count($units) - 1];

                if ($last !== null && $last[0] === ' ') {
                    $units[count($units) - 1][2] = $end;
                } elseif ($last !== null) {
                    $units[] = [' ', $offset, $end];
                }

                continue;
            }

            $units[] = [self::MAPPED[$character] ?? $character, $offset, $end];
        }

        if ($units !== [] && $units[count($units) - 1][0] === ' ') {
            array_pop($units);
        }

        return $units;
    }

    /**
     * Every occurrence of the term in the text, as [byte start, byte end] in the original text. An empty term matches nothing.
     *
     * @return list<array{int, int}>
     */
    public static function occurrences(string $text, string $term): array
    {
        $needle = array_column(self::units($term), 0);
        $haystack = self::units($text);
        $size = count($needle);

        if ($size === 0) {
            return [];
        }

        $found = [];

        for ($start = 0, $last = count($haystack) - $size; $start <= $last; $start++) {
            $match = true;

            for ($k = 0; $k < $size; $k++) {
                if ($haystack[$start + $k][0] !== $needle[$k]) {
                    $match = false;

                    break;
                }
            }

            if ($match) {
                $found[] = [$haystack[$start][1], $haystack[$start + $size - 1][2]];
            }
        }

        return $found;
    }
}

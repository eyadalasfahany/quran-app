<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * The text of an OpenITI unit, with the closed list of step 6b.6 (ADR 0076 §3, Q1) and nothing else: G1 line-start markers on
 * body lines, G2 the number prefix on the first line, G3 page and manuscript tokens, G4 empty lines dropped and the rest joined
 * with one ASCII space, G5 ASCII whitespace trimmed at both ends. Diacritics, marks, punctuation and internal spaces stay.
 */
final class OpenItiTextCleaner
{
    private const string ASCII_WHITESPACE = " \t\r\n\f\v";

    /**
     * @param  list<string>  $lines  the unit's lines, marker line first
     */
    public function clean(array $lines, int $markerEnd): string
    {
        $parts = [];

        foreach ($lines as $index => $line) {
            $text = $index === 0 ? substr($line, $markerEnd) : ltrim($line, '~# ');
            $text = (string) preg_replace('~PageV\S+|ms\d+~', '', $text);

            if (trim($text, self::ASCII_WHITESPACE) === '') {
                continue;
            }

            $parts[] = $text;
        }

        return trim(implode(' ', $parts), self::ASCII_WHITESPACE);
    }
}

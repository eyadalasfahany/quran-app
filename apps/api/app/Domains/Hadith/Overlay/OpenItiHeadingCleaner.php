<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * An OpenITI heading's title (ADR 0076 §3, step 6b.6): the heading marker of the first line, the page and manuscript tokens,
 * continuation lines (starting with ~~) joined with one ASCII space, and ASCII whitespace trimmed at both ends. Nothing else.
 */
final class OpenItiHeadingCleaner
{
    private const string ASCII_WHITESPACE = " \t\r\n\f\v";

    /**
     * @param  list<string>  $lines  the heading line first, then its continuation lines
     */
    public function clean(array $lines): CleanedHeading
    {
        $first = array_shift($lines) ?? '';
        $title = (string) preg_replace('~^###[ ]*[|$]+[ ]?~', '', $first);
        $continuation = [];

        foreach ($lines as $line) {
            if (! str_starts_with($line, '~~')) {
                break;
            }

            $continuation[] = (string) preg_replace('#^~~ *#', '', $line);
        }

        $joined = trim(implode(' ', [$title, ...$continuation]), self::ASCII_WHITESPACE);
        $joined = (string) preg_replace('~PageV\S+|ms\d+~', '', $joined);

        return new CleanedHeading(
            title: trim($joined, self::ASCII_WHITESPACE),
            hadContinuation: $continuation !== [],
        );
    }
}

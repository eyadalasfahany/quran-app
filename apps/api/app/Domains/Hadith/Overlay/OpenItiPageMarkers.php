<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * Shamela page and volume markers in OpenITI headings, such as «[ص: 11]» (page) and «[ج: 2]» (volume), with ASCII or Arabic-Indic
 * digits (ADR 0076 §3, approved 7 Nov 2026). A marker and the whitespace around it become one ASCII space, and the ends are
 * trimmed. Nothing else in the title changes. Pure.
 */
final class OpenItiPageMarkers
{
    private const string MARKER = '(?:\s*\[\s*(?:ص|ج)\s*[:：]?\s*[0-9\x{0660}-\x{0669}]+\s*\]\s*)';

    private const string STRIP = '~'.self::MARKER.'+~u';

    private const string CONTAINS = '~'.self::MARKER.'~u';

    public static function strip(string $title): string
    {
        return trim((string) preg_replace(self::STRIP, ' ', $title), " \t\r\n\f\v");
    }

    public static function contains(string $title): bool
    {
        return preg_match(self::CONTAINS, $title) === 1;
    }
}

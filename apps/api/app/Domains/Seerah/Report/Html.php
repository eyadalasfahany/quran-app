<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Report;

/**
 * Escaping and highlighting for the review report. Every value that reaches the page passes through esc(); a quote is highlighted
 * inside its paragraph by byte position, so the paragraph is shown exactly as the book has it.
 */
final class Html
{
    public static function esc(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    }

    /**
     * The paragraph with the first occurrence of the quote marked. Null when the quote is not in the paragraph.
     */
    public static function highlight(string $paragraph, string $quote): ?string
    {
        if ($quote === '') {
            return null;
        }

        $position = strpos($paragraph, $quote);

        if ($position === false) {
            return null;
        }

        return self::esc(substr($paragraph, 0, $position))
            .'<mark>'.self::esc($quote).'</mark>'
            .self::esc(substr($paragraph, $position + strlen($quote)));
    }

    public static function badge(string $text, string $class = ''): string
    {
        return '<span class="badge '.self::esc($class).'">'.self::esc($text).'</span>';
    }
}

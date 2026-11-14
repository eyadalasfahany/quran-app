<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Format;

use JsonException;

/**
 * The one JSON rendering of the Seerah data (data-format.md, Formatting): two-space indent, Arabic as literal characters, no
 * escaped slashes, floats keep their fraction, one trailing newline. `seerah:fmt --check` and the structure writer both use it.
 */
final class SeerahJson
{
    /**
     * @throws JsonException when the text is not valid JSON
     */
    public static function decode(string $text): mixed
    {
        return json_decode($text, false, 512, JSON_THROW_ON_ERROR);
    }

    /**
     * Renders a decoded value (objects as stdClass, lists as arrays) in the canonical layout.
     */
    public static function render(mixed $value): string
    {
        $json = json_encode(
            $value,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR,
        );

        // Strings in JSON never hold a raw line break, so every run of leading spaces is indentation: halve it.
        return preg_replace_callback(
            '/^ +/m',
            static fn (array $match): string => str_repeat(' ', intdiv(strlen($match[0]), 2)),
            $json,
        )."\n";
    }

    /**
     * The canonical form of a file's text: the text itself when it is already canonical, else the rendering of its value.
     *
     * @throws JsonException when the text is not valid JSON
     */
    public static function canonicalText(string $text): string
    {
        return self::render(self::decode($text));
    }

    /**
     * The compact form a record's hash is taken over: key order as written, no spaces.
     *
     * @param  array<array-key, mixed>  $record
     */
    public static function compact(array $record): string
    {
        return json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR);
    }
}

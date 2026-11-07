<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * The word-set text check of ADR 0076 §5 and step 6b.6 (8.5.1). For comparison only: nothing built here is ever stored. Pure.
 */
final class HadithWordSet
{
    private const array FOLD = ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ى' => 'ي', 'ة' => 'ه'];

    /**
     * @return array<string, true>
     */
    public static function of(string $text): array
    {
        $text = (string) preg_replace('~PageV\S+|ms\d+~', '', $text);
        $text = (string) preg_replace('~[\x{064B}-\x{0652}\x{0670}\x{0640}\x{200B}-\x{200F}\x{202A}-\x{202E}\x{FEFF}]~u', '', $text);
        $text = strtr($text, self::FOLD);
        $text = (string) preg_replace('~[^\x{0621}-\x{063A}\x{0641}-\x{064A} ]+~u', ' ', $text);

        $set = [];

        foreach (explode(' ', $text) as $word) {
            if ($word !== '' && mb_strlen($word) >= 3) {
                $set[$word] = true;
            }
        }

        return $set;
    }

    /**
     * @param  array<string, true>  $first
     * @param  array<string, true>  $second
     */
    public static function jaccard(array $first, array $second): float
    {
        if ($first === [] || $second === []) {
            return 0.0;
        }

        $shared = count(array_intersect_key($first, $second));
        $union = count($first) + count($second) - $shared;

        return $shared / $union;
    }

    /**
     * The share of the unit's words that the other text also has. 0.0 for an empty unit.
     *
     * @param  array<string, true>  $unit
     * @param  array<string, true>  $other
     */
    public static function containment(array $unit, array $other): float
    {
        if ($unit === []) {
            return 0.0;
        }

        return count(array_intersect_key($unit, $other)) / count($unit);
    }
}

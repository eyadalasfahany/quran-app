<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

/**
 * ADR 0078 step 2: which of our collections a HadeethEnc attribution names. Only the names below count; the forty-hadith
 * collections have no name here, so no explanation is linked to them by attribution (reported, not guessed).
 */
final class HadithAttributionNames
{
    /**
     * @var array<string, list<string>> slug => the Arabic names, written as the attribution writes them
     */
    private const array NAMES = [
        'bukhari' => ['البخاري', 'الشيخان', 'متفق عليه'],
        'muslim' => ['مسلم', 'الشيخان', 'متفق عليه'],
        'abudawud' => ['أبو داود'],
        'tirmidhi' => ['الترمذي'],
        'nasai' => ['النسائي'],
        'ibnmajah' => ['ابن ماجه'],
        'malik' => ['مالك'],
    ];

    /**
     * The configured collection slugs an attribution names, in configuration order. «متفق عليه» names two.
     *
     * @param  list<string>  $collections
     * @return list<string>
     */
    public static function collections(string $attribution, array $collections): array
    {
        $folded = self::fold($attribution);
        $named = [];

        foreach (self::NAMES as $slug => $names) {
            foreach ($names as $name) {
                if (preg_match('~(?<!\p{L})(?:و)?'.preg_quote(self::fold($name), '~').'(?!\p{L})~u', $folded) === 1) {
                    $named[] = $slug;

                    break;
                }
            }
        }

        return array_values(array_filter($collections, static fn (string $slug): bool => in_array($slug, $named, true)));
    }

    /**
     * Hamza, alif maqsura, ta marbuta and diacritics folded, so that the attribution and the names compare as written.
     */
    private static function fold(string $text): string
    {
        $text = (string) preg_replace('~[\x{064B}-\x{0652}\x{0670}\x{0640}\x{200B}-\x{200F}\x{202A}-\x{202E}\x{FEFF}]~u', '', $text);

        return strtr($text, ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ى' => 'ي', 'ة' => 'ه']);
    }
}

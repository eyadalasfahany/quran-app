<?php

declare(strict_types=1);

namespace App\Support\QuranText;

/**
 * The derived search form of Arabic text (spec §7). Mirrors packages/quran-text-check normalizeForSearch.
 * Source text is never passed through here for storage; only the derived text_search column is.
 */
final class SearchTextNormalizer
{
    /**
     * Alef forms, alef maksura and ta marbuta, plus alef wasla.
     *
     * @var array<string, string>
     */
    private const array MAPPED = [
        'آ' => 'ا',
        'أ' => 'ا',
        'إ' => 'ا',
        'ة' => 'ه',
        'ى' => 'ي',
        'ٱ' => 'ا',
    ];

    /**
     * Tatweel, harakat and the Quranic annotation marks removed before mapping.
     */
    private const string STRIPPED = '/[\x{0640}\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}]/u';

    public function normalize(string $text): string
    {
        $stripped = preg_replace(self::STRIPPED, '', $text);
        $collapsed = $stripped === null ? null : preg_replace('/\s+/u', ' ', strtr($stripped, self::MAPPED));

        if ($collapsed === null) {
            throw new \UnexpectedValueException('Search normalisation failed on text that is not valid UTF-8.');
        }

        return trim($collapsed);
    }
}

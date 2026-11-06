<?php

declare(strict_types=1);

namespace App\Support\HadithText;

/**
 * The derived search form of hadith text (ADR 0042 §8). Self-contained: it does not share code with the Quran
 * normaliser, whose \s and trim() differ from the TypeScript mirror. The mirror is
 * apps/mobile/src/core/text/normalizeHadithForSearch.ts; both read tests/Fixtures/hadith/search-normalizer.json.
 * Stored Arabic text is never passed through here; only the derived text_search column is.
 */
final class HadithSearchTextNormalizer
{
    /**
     * Invisible marks, tatweel, harakat, dagger alef and the Quranic annotation marks, removed first.
     */
    private const string STRIPPED = '/[\x{200B}-\x{200F}\x{061C}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FEFF}\x{0640}\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}]/u';

    /**
     * The explicit whitespace set. U+0085 and U+2060 are deliberately absent.
     */
    private const string WHITESPACE = '/[\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}]+/u';

    private const string EDGE_SPACES = '/^ | \z/u';

    /**
     * Alef forms, ta marbuta and alef maksura, mapped after stripping.
     *
     * @var array<string, string>
     */
    private const array MAPPED = [
        "\u{0622}" => "\u{0627}",
        "\u{0623}" => "\u{0627}",
        "\u{0625}" => "\u{0627}",
        "\u{0671}" => "\u{0627}",
        "\u{0629}" => "\u{0647}",
        "\u{0649}" => "\u{064A}",
    ];

    /**
     * @throws \UnexpectedValueException when the text is not valid UTF-8
     */
    public function normalize(string $text): string
    {
        $stripped = preg_replace(self::STRIPPED, '', $text);
        $mapped = $stripped === null ? null : strtr($stripped, self::MAPPED);
        $collapsed = $mapped === null ? null : preg_replace(self::WHITESPACE, ' ', $mapped);
        $trimmed = $collapsed === null ? null : preg_replace(self::EDGE_SPACES, '', $collapsed);

        if ($trimmed === null) {
            throw new \UnexpectedValueException('Hadith search normalisation failed on text that is not valid UTF-8.');
        }

        return $trimmed;
    }
}

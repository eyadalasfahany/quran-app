<?php

declare(strict_types=1);

namespace App\Support\QuranText;

use App\Domains\Azkar\Exceptions\QuranMapException;

/**
 * The aligned Imla'i word list of every verse, from resources/quran/word-map.json (ADR 0093). It is generated from the
 * Tanzil seed by packages/quran-text-check (`npm run word-map:api`), and it holds the words only: positions are list
 * indexes plus one. It is used to validate a partial-verse range and to locate a quoted run. It is never rendered; the
 * app renders the stored Uthmani text by position from content.db.
 */
final class QuranWordMap
{
    /**
     * @var array<string, list<string>>|null
     */
    private ?array $verses;

    /**
     * @param  array<string, list<string>>|null  $verses  Verses by "surah:ayah", in Quran order. Null reads the committed file.
     */
    public function __construct(?array $verses = null)
    {
        $this->verses = $verses;
    }

    public static function path(): string
    {
        return base_path('resources/quran/word-map.json');
    }

    /**
     * The number of words in a verse, or null when the verse is not in the map.
     */
    public function wordCount(int $surah, int $ayah): ?int
    {
        $words = $this->words($surah, $ayah);

        return $words === null ? null : count($words);
    }

    /**
     * The words of a verse in position order (position = index + 1), or null when the verse is not in the map.
     *
     * @return list<string>|null
     */
    public function words(int $surah, int $ayah): ?array
    {
        return $this->verses()[$surah.':'.$ayah] ?? null;
    }

    /**
     * Every verse in Quran order, keyed by "surah:ayah".
     *
     * @return array<string, list<string>>
     */
    public function verses(): array
    {
        $this->verses ??= $this->load();

        return $this->verses;
    }

    /**
     * @return array<string, list<string>>
     *
     * @throws QuranMapException
     */
    private function load(): array
    {
        $content = @file_get_contents(self::path());

        if ($content === false) {
            throw new QuranMapException('The Quran word map cannot be read.');
        }

        $decoded = json_decode($content, true, flags: JSON_THROW_ON_ERROR);

        if (! is_array($decoded) || $decoded === []) {
            throw new QuranMapException('The Quran word map is empty or malformed.');
        }

        $verses = [];

        foreach ($decoded as $key => $words) {
            if (! is_string($key) || ! is_array($words) || ! array_is_list($words) || $words === []) {
                throw new QuranMapException('The Quran word map is malformed.');
            }

            $list = [];

            foreach ($words as $word) {
                if (! is_string($word) || $word === '') {
                    throw new QuranMapException('The Quran word map is malformed.');
                }

                $list[] = $word;
            }

            $verses[$key] = $list;
        }

        return $verses;
    }
}

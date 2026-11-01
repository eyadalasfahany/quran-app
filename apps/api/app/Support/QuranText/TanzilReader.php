<?php

declare(strict_types=1);

namespace App\Support\QuranText;

final class TanzilReader
{
    public static function path(): string
    {
        return base_path('../../packages/quran-text-check/data/tanzil-quran-uthmani-1.1.txt');
    }

    /**
     * The standard-orthography text, used only to locate azkar Quran spans (ADR 0031 §11). Never rendered.
     */
    public static function simplePath(): string
    {
        return base_path('../../packages/quran-text-check/data/tanzil-quran-simple-1.1.txt');
    }

    /**
     * Verse texts in file order. Blank lines and lines starting with "#" are skipped.
     * The text is everything after the second "|", unchanged.
     *
     * @return list<string>
     */
    public function texts(): array
    {
        $path = self::path();

        if (! is_file($path)) {
            throw new QuranTextException("Unable to read the Tanzil text at [{$path}].");
        }

        $content = file_get_contents($path);

        if ($content === false) {
            throw new QuranTextException("Unable to read the Tanzil text at [{$path}].");
        }

        return self::textsFrom($content);
    }

    /**
     * @return list<string>
     */
    public static function textsFrom(string $content): array
    {
        $texts = [];

        foreach (explode("\n", $content) as $line) {
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $first = strpos($line, '|');
            $second = $first === false ? false : strpos($line, '|', $first + 1);

            if ($first === false || $first === 0 || $second === false || $second <= $first + 1) {
                throw new QuranTextException('A Tanzil line does not have sura, ayah and text separators.');
            }

            $sura = substr($line, 0, $first);
            $aya = substr($line, $first + 1, $second - $first - 1);

            if (preg_match('/^[0-9]+$/', $sura) !== 1 || preg_match('/^[0-9]+$/', $aya) !== 1) {
                throw new QuranTextException('A Tanzil line does not have numeric sura and ayah numbers.');
            }

            $texts[] = substr($line, $second + 1);
        }

        return $texts;
    }
}

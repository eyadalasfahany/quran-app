<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Exceptions\HadithDataFileException;

/**
 * Developer-approved placements of a hadith that falls in no section range (config hadith.placements, ADR 0076 decision 6).
 * A placement names the section (book) the source's OpenITI data gives. Every value is validated here.
 */
final class HadithPlacements
{
    /**
     * Checks every configured slug. Called before any import work.
     *
     * @throws HadithDataFileException
     */
    public function assertKnown(): void
    {
        foreach (array_keys($this->all()) as $slug) {
            if (! in_array((string) $slug, array_map('strval', (array) config('hadith.collections')), true)) {
                throw new HadithDataFileException('Config [hadith.placements] names an unknown collection ['.$slug.'].');
            }
        }
    }

    /**
     * The validated placements of one slug, in config order.
     *
     * @return list<array{number: string, section: string}>
     *
     * @throws HadithDataFileException
     */
    public function forSlug(string $slug): array
    {
        $this->assertKnown();

        $entries = $this->all()[$slug] ?? [];

        if (! is_array($entries)) {
            throw new HadithDataFileException('Config [hadith.placements] for ['.$slug.'] must map numbers to section keys.');
        }

        $valid = [];

        foreach ($entries as $number => $section) {
            if (! is_numeric($number) || ! is_string($section) || $section === '') {
                throw new HadithDataFileException('Config [hadith.placements] for ['.$slug.'] holds a number or section key that is not valid.');
            }

            $valid[] = ['number' => (string) $number, 'section' => $section];
        }

        return $valid;
    }

    /**
     * @return array<array-key, mixed>
     */
    private function all(): array
    {
        $all = config('hadith.placements', []);

        return is_array($all) ? $all : [];
    }
}

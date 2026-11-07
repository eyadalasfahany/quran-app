<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Exceptions\HadithRangeCorrectionException;
use App\Domains\Hadith\Sources\Records\SourceSection;

/**
 * Developer-approved section range corrections (config hadith.range_corrections, 7 Nov 2026). A correction replaces a
 * section's first and last hadith number before books are assigned. Every value is validated here.
 */
final class HadithRangeCorrections
{
    /**
     * Checks every configured slug. Called before any import work.
     *
     * @throws HadithRangeCorrectionException
     */
    public function assertKnown(): void
    {
        $all = $this->all();

        foreach (array_keys($all) as $slug) {
            if (! in_array((string) $slug, array_map('strval', (array) config('hadith.collections')), true)) {
                throw new HadithRangeCorrectionException('Config [hadith.range_corrections] names an unknown collection ['.$slug.'].');
            }
        }
    }

    /**
     * The validated corrections of one slug, keyed by section number.
     *
     * @return array<string, array{first: string, last: string}>
     *
     * @throws HadithRangeCorrectionException
     */
    public function forSlug(string $slug): array
    {
        $this->assertKnown();

        $entries = $this->all()[$slug] ?? [];

        if (! is_array($entries)) {
            throw new HadithRangeCorrectionException('Config [hadith.range_corrections] for ['.$slug.'] must be a list of sections.');
        }

        $valid = [];

        foreach ($entries as $section => $range) {
            $first = is_array($range) ? ($range['first'] ?? null) : null;
            $last = is_array($range) ? ($range['last'] ?? null) : null;

            if (! is_string($first) || ! is_string($last) || ! is_numeric($first) || ! is_numeric($last) || (float) $first > (float) $last) {
                throw new HadithRangeCorrectionException('Config [hadith.range_corrections] for ['.$slug.'] section ['.$section.'] needs string first and last numbers, first not after last.');
            }

            $valid[(string) $section] = ['first' => $first, 'last' => $last];
        }

        return $valid;
    }

    /**
     * The sections with corrections applied, in file order, and the section keys that were corrected.
     *
     * @param  list<SourceSection>  $sections
     * @return array{sections: list<SourceSection>, applied: list<string>}
     *
     * @throws HadithRangeCorrectionException when a correction names a section the source does not have
     */
    public function apply(string $slug, array $sections): array
    {
        $corrections = $this->forSlug($slug);
        $keys = [];
        $result = [];
        $applied = [];

        foreach ($sections as $section) {
            $keys[] = $section->key;

            if (! array_key_exists($section->key, $corrections)) {
                $result[] = $section;

                continue;
            }

            $correction = $corrections[$section->key];
            $result[] = new SourceSection($section->key, $section->titleEn, $correction['first'], $correction['last'], $section->firstArabicNumber, $section->lastArabicNumber);
            $applied[] = $section->key;
        }

        foreach (array_keys($corrections) as $key) {
            if (! in_array((string) $key, $keys, true)) {
                throw new HadithRangeCorrectionException('Collection ['.$slug.']: the range correction for section ['.$key.'] names a section the source does not have.');
            }
        }

        return ['sections' => $result, 'applied' => $applied];
    }

    /**
     * @return array<array-key, mixed>
     */
    private function all(): array
    {
        $all = config('hadith.range_corrections', []);

        return is_array($all) ? $all : [];
    }
}

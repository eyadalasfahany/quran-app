<?php

declare(strict_types=1);

namespace App\Domains\Names\Services;

use App\Domains\Names\Data\NamesImportIssue;
use App\Domains\Names\Data\NamesImportPlan;
use App\Support\QuranText\SearchTextNormalizer;

final class NamesReviewedFileParser
{
    private const int EXPECTED_COUNT = 99;

    private const int SCHEMA_VERSION = 1;

    public function __construct(private readonly SearchTextNormalizer $normalizer) {}

    /**
     * @return array{plan: NamesImportPlan|null, issues: list<NamesImportIssue>}
     */
    public function parse(string $path, ?string $expectedListSlug): array
    {
        $issues = [];

        if (! is_file($path)) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'file_missing', $path);

            return ['plan' => null, 'issues' => $issues];
        }

        $raw = file_get_contents($path);

        if ($raw === false) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'file_unreadable', $path);

            return ['plan' => null, 'issues' => $issues];
        }

        $sourceSha256 = hash('sha256', $raw);

        try {
            $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'json_invalid', $path);

            return ['plan' => null, 'issues' => $issues];
        }

        if (! is_array($decoded)) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'json_not_object', $path);

            return ['plan' => null, 'issues' => $issues];
        }

        $schemaVersion = $decoded['schema_version'] ?? null;

        if ($schemaVersion !== self::SCHEMA_VERSION) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'schema_version', 'schema_version');
        }

        $listSlug = $decoded['list_slug'] ?? null;

        if (! is_string($listSlug) || $listSlug === '' || strlen($listSlug) > 64) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'list_slug', 'list_slug');
        } elseif ($expectedListSlug !== null && $listSlug !== $expectedListSlug) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'list_slug_mismatch', 'list_slug');
        }

        $sourceVersion = $decoded['source_version'] ?? null;

        if (! is_string($sourceVersion) || $sourceVersion === '' || strlen($sourceVersion) > 64) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'source_version', 'source_version');
        }

        $listBlock = $decoded['list'] ?? null;

        if (! is_array($listBlock)) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'list_block', 'list');
            $listBlock = [];
        }

        $titleAr = $listBlock['title_ar'] ?? null;
        $sourceLabelAr = $listBlock['source_label_ar'] ?? null;

        if (! is_string($titleAr) || $titleAr === '' || mb_strlen($titleAr) > 200) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'title_ar', 'list.title_ar');
        }

        if (! is_string($sourceLabelAr) || $sourceLabelAr === '' || mb_strlen($sourceLabelAr) > 500) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'source_label_ar', 'list.source_label_ar');
        }

        $attributionAr = $this->optionalString($listBlock['attribution_ar'] ?? null);
        $attributionEn = $this->optionalString($listBlock['attribution_en'] ?? null);
        $editionReference = $this->optionalString($listBlock['edition_reference'] ?? null, 500);

        if ($attributionAr === false || $attributionEn === false || $editionReference === false) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'list_optional_string', 'list');
        }

        $namesRaw = $decoded['names'] ?? null;

        if (! is_array($namesRaw)) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'names_block', 'names');

            return ['plan' => null, 'issues' => $issues];
        }

        if (count($namesRaw) !== self::EXPECTED_COUNT) {
            $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'names_count', 'names');
        }

        $names = [];
        $seenPositions = [];
        $seenSlugs = [];
        $seenArabic = [];

        foreach ($namesRaw as $index => $row) {
            $pathKey = 'names['.$index.']';

            if (! is_array($row)) {
                $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'name_row', $pathKey);

                continue;
            }

            $position = $row['position'] ?? null;

            if (! is_int($position) && ! (is_string($position) && ctype_digit($position))) {
                $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'position', $pathKey.'.position');

                continue;
            }

            $position = (int) $position;

            if ($position < 1 || $position > self::EXPECTED_COUNT) {
                $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'position_range', $pathKey.'.position');
            }

            if (isset($seenPositions[$position])) {
                $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'position_duplicate', $pathKey.'.position');
            }

            $seenPositions[$position] = true;

            $slug = $row['name_slug'] ?? null;
            $slugValid = is_string($slug) && $slug !== '' && strlen($slug) <= 64 && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) === 1;

            if (! $slugValid) {
                $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'name_slug', $pathKey.'.name_slug');
            } elseif (isset($seenSlugs[$slug])) {
                $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'name_slug_duplicate', $pathKey.'.name_slug');
                $slugValid = false;
            } else {
                $seenSlugs[$slug] = true;
            }

            $nameAr = $row['name_ar'] ?? null;

            if (! is_string($nameAr) || $nameAr === '') {
                $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'name_ar', $pathKey.'.name_ar');

                continue;
            }

            if (isset($seenArabic[$nameAr])) {
                $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'name_ar_duplicate', $pathKey.'.name_ar');
            }

            $seenArabic[$nameAr] = true;

            if (! $slugValid) {
                continue;
            }

            try {
                $textSearch = $this->normalizer->normalize($nameAr);
            } catch (\UnexpectedValueException) {
                $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'name_ar_utf8', $pathKey.'.name_ar');

                continue;
            }

            $names[] = [
                'id' => $position,
                'position' => $position,
                'name_slug' => $slug,
                'name_ar' => $nameAr,
                'text_search' => $textSearch,
            ];
        }

        for ($expected = 1; $expected <= self::EXPECTED_COUNT; $expected++) {
            if (! isset($seenPositions[$expected])) {
                $issues[] = new NamesImportIssue(NamesImportIssue::ERROR, 'position_missing', 'names.position.'.$expected);
            }
        }

        foreach ($issues as $issue) {
            if ($issue->isError()) {
                return ['plan' => null, 'issues' => $issues];
            }
        }

        usort($names, static fn (array $a, array $b): int => $a['position'] <=> $b['position']);

        if (! is_string($listSlug) || ! is_string($sourceVersion) || ! is_string($titleAr) || ! is_string($sourceLabelAr)) {
            return ['plan' => null, 'issues' => $issues];
        }

        return [
            'plan' => new NamesImportPlan(
                list: [
                    'list_slug' => $listSlug,
                    'title_ar' => $titleAr,
                    'source_label_ar' => $sourceLabelAr,
                    'attribution_ar' => is_string($attributionAr) ? $attributionAr : null,
                    'attribution_en' => is_string($attributionEn) ? $attributionEn : null,
                    'edition_reference' => is_string($editionReference) ? $editionReference : null,
                    'source_version' => $sourceVersion,
                ],
                names: $names,
                sourceSha256: $sourceSha256,
            ),
            'issues' => $issues,
        ];
    }

    private function optionalString(mixed $value, int $maxLength = 2000): string|null|false
    {
        if ($value === null) {
            return null;
        }

        if (! is_string($value)) {
            return false;
        }

        if (mb_strlen($value) > $maxLength) {
            return false;
        }

        return $value;
    }
}

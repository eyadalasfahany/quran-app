<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Sources\FawazHadithSource;

/**
 * The "unchanged" fingerprint of one collection (step 6). It reads no file: the mapper version, the pinned commit and edition
 * hash, the position, the attribution, the titles and the reference exceptions. Any of them changing bumps the version.
 */
final class HadithImportFingerprint
{
    public function __construct(
        private readonly FawazHadithSource $source,
        private readonly HadithTitles $titles,
        private readonly HadithRangeCorrections $corrections,
    ) {}

    public function of(string $slug, string $attributionAr, string $attributionEn): string
    {
        $sourceSlug = $this->source->sourceSlug($slug);
        $pins = config('hadith.files', []);
        $exceptions = config('hadith.reference_exceptions', []);
        $completenessExceptions = config('hadith.completeness_exceptions', []);
        $completenessExceptions = is_array($completenessExceptions) ? $completenessExceptions : [];
        $placements = config('hadith.placements', []);
        $placements = is_array($placements) ? $placements : [];
        $position = array_search($slug, (array) config('hadith.collections'), true);

        $inputs = [
            'mapper' => HadithMapper::VERSION,
            'commit' => (string) config('hadith.commit'),
            'edition_sha256' => is_array($pins) ? ($pins['editions/ara-'.$sourceSlug.'.json'] ?? null) : null,
            'position' => is_int($position) ? $position + 1 : null,
            'attribution_ar' => $attributionAr,
            'attribution_en' => $attributionEn,
            'titles' => $this->titles->forSlug($slug),
            'reference_exceptions' => is_array($exceptions) ? ($exceptions[$slug] ?? []) : [],
            'completeness_exceptions' => $completenessExceptions[$slug] ?? [],
            'placements' => $placements[$slug] ?? [],
            'range_corrections' => $this->corrections->forSlug($slug),
        ];

        return hash('sha256', json_encode($inputs, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}

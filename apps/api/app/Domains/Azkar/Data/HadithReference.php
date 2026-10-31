<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

/**
 * One reference from a hadith provider. Every provider field is optional; attribution is always set (ADR 0031 §2.4).
 */
final class HadithReference extends Data
{
    /**
     * @param  list<string>|null  $similarUrls
     */
    public function __construct(
        public readonly ?string $textAr,
        public readonly ?string $narrator,
        public readonly ?string $muhaddith,
        public readonly ?string $source,
        public readonly ?string $pageOrNumber,
        public readonly ?string $grade,
        public readonly ?string $canonicalUrl,
        public readonly ?string $explanationUrl,
        public readonly ?array $similarUrls,
        public readonly string $attribution,
    ) {}
}

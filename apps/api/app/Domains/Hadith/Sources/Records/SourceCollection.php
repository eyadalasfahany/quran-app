<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Sources\Records;

/**
 * A whole collection from one Arabic edition file, in file order.
 */
final readonly class SourceCollection
{
    /**
     * @param  list<SourceSection>  $sections
     * @param  list<SourceHadith>  $hadiths
     */
    public function __construct(
        public string $slug,
        public string $sourceSlug,
        public string $editionName,
        public ?string $titleEn,
        public array $sections,
        public array $hadiths,
    ) {}
}

<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Import\Records;

/**
 * The title matcher's output for one collection. Titles and counts only. hadithapiChapters counts every chapter received;
 * unnumberedChapters counts those with no usable chapterNumber, and duplicateChapterNumbers counts numbers that more than one
 * chapter carries (their titles are dropped, so their hadith count as unmapped).
 */
final readonly class CollectionProposal
{
    /**
     * @param  list<SectionMatch>  $matches
     */
    public function __construct(
        public string $slug,
        public string $bookSlug,
        public array $matches,
        public int $mappingErrors,
        public int $hadithapiChapters,
        public int $hadithapiHadith,
        public int $ambiguousNumbers,
        public int $unnumberedChapters,
        public int $duplicateChapterNumbers,
    ) {}
}

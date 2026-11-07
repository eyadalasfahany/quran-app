<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Validation;

use App\Domains\Hadith\Exceptions\HadithReferenceMismatchException;
use App\Domains\Hadith\Import\Records\CollectionStats;
use App\Domains\Hadith\Import\Records\HadithIssue;
use App\Domains\Hadith\Import\Records\MappingResult;

/**
 * The checks the mapper does not make: column limits, attribution, empty collections, and count warnings against
 * info.json (warnings only, plan step 6). Never throws for data.
 */
final class HadithCollectionValidator
{
    private const int HADITH_NUMBER_MAX = 32;

    private const int ARABIC_NUMBER_MAX = 32;

    private const int BOOK_NUMBER_MAX = 16;

    private const int SOURCE_KEY_MAX = 96;

    private const int COLLECTION_TITLE_MAX = 200;

    private const int BOOK_TITLE_MAX = 500;

    private const int REFERENCE_NUMBERS_SHOWN = 20;

    /**
     * @return list<HadithIssue>
     */
    public function validate(string $slug, MappingResult $mapping): array
    {
        $issues = $mapping->issues;
        $plan = $mapping->plan;
        $stats = $mapping->stats;
        $error = HadithIssue::SEVERITY_ERROR;
        $warning = HadithIssue::SEVERITY_WARNING;

        if ($stats->imported === 0) {
            $issues[] = new HadithIssue($error, 'empty_collection', null);
        }

        $collection = $plan->collection;

        if ($collection['attribution_ar'] === '' || $collection['attribution_en'] === '') {
            $issues[] = new HadithIssue($error, 'source_attribution_missing', null);
        }

        if (is_string($collection['title_ar'] ?? null) && strlen($collection['title_ar']) > self::COLLECTION_TITLE_MAX) {
            $issues[] = new HadithIssue($error, 'title_too_long', $slug);
        }

        foreach ($plan->books as $book) {
            $bookNumber = (string) $book['book_number'];

            if (strlen((string) $bookNumber) > self::BOOK_NUMBER_MAX) {
                $issues[] = new HadithIssue($error, 'book_number_too_long', $bookNumber);
            }

            if (is_string($book['title_ar']) && strlen($book['title_ar']) > self::BOOK_TITLE_MAX) {
                $issues[] = new HadithIssue($error, 'title_too_long', $bookNumber);
            }

            if (strlen((string) $book['source_key']) > self::SOURCE_KEY_MAX) {
                $issues[] = new HadithIssue($error, 'source_key_too_long', (string) $book['source_key']);
            }
        }

        foreach ($plan->entries as $entry) {
            $number = (string) $entry['hadith_number'];

            if (strlen($number) > self::HADITH_NUMBER_MAX) {
                $issues[] = new HadithIssue($error, 'hadith_number_too_long', $number);
            }

            if (is_string($entry['arabic_number']) && strlen($entry['arabic_number']) > self::ARABIC_NUMBER_MAX) {
                $issues[] = new HadithIssue($error, 'arabic_number_too_long', $number);
            }

            if (strlen((string) $entry['source_key']) > self::SOURCE_KEY_MAX) {
                $issues[] = new HadithIssue($error, 'source_key_too_long', $number);
            }
        }

        foreach ($plan->grades as $grade) {
            if (strlen((string) $grade['source_key']) > self::SOURCE_KEY_MAX) {
                $issues[] = new HadithIssue($error, 'source_key_too_long', (string) $grade['source_key']);
            }
        }

        if ($stats->infoHadithCount !== null && $stats->hadithInFile !== $stats->infoHadithCount) {
            $issues[] = new HadithIssue($warning, 'hadith_count_differs_from_info', null);
        }

        if ($stats->infoLastHadithNumber !== null && $stats->lastHadithNumberInFile !== $stats->infoLastHadithNumber) {
            $issues[] = new HadithIssue($warning, 'last_hadith_number_differs_from_info', null);
        }

        if ($stats->infoSectionCount !== null && $stats->sectionsInFile !== $stats->infoSectionCount) {
            $issues[] = new HadithIssue($warning, 'section_count_differs_from_info', null);
        }

        if ($stats->noText > 0) {
            $issues[] = new HadithIssue($warning, 'no_text_hadith', null);
        }

        if ($stats->emptySections > 0) {
            $issues[] = new HadithIssue($warning, 'empty_section', null);
        }

        if ($stats->referenceExceptionNumbers !== []) {
            $issues[] = new HadithIssue($warning, 'reference_exception_used', null);
        }

        return $issues;
    }

    /**
     * @throws HadithReferenceMismatchException when a hadith disagrees with reference.book and is not an exception
     */
    public function assertReferencesAgree(string $slug, CollectionStats $stats): void
    {
        if ($stats->referenceMismatchNumbers === []) {
            return;
        }

        throw new HadithReferenceMismatchException(
            $slug,
            count($stats->referenceMismatchNumbers),
            array_slice($stats->referenceMismatchNumbers, 0, self::REFERENCE_NUMBERS_SHOWN),
        );
    }
}

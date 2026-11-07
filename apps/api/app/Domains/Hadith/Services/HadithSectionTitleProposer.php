<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Exceptions\HadithPinException;
use App\Domains\Hadith\Exceptions\HadithRangeCorrectionException;
use App\Domains\Hadith\Exceptions\HadithSourceFormatException;
use App\Domains\Hadith\Import\Records\CollectionProposal;
use App\Domains\Hadith\Sources\HadithSourceRegistry;
use App\Integrations\HadithApiCom\HadithApiComClient;
use App\Integrations\HadithApiCom\HadithApiComException;
use App\Integrations\HadithApiFawaz\HadithApiFawazException;
use Carbon\CarbonImmutable;

/**
 * Reads both sides for one collection (dev only): the fawazahmed0 sections with their hadith numbers, and hadithapi.com's
 * chapters and references. Then it applies the matcher. Writes nothing.
 */
final class HadithSectionTitleProposer
{
    public function __construct(
        private readonly HadithSourceRegistry $sources,
        private readonly HadithMapper $mapper,
        private readonly HadithSectionTitleMatcher $matcher,
        private readonly HadithApiComClient $client,
    ) {}

    /**
     * @throws HadithApiComException
     * @throws HadithPinException
     * @throws HadithSourceFormatException
     * @throws HadithApiFawazException
     * @throws HadithRangeCorrectionException
     */
    public function propose(string $slug): CollectionProposal
    {
        $primary = $this->sources->primary();
        $collection = $primary->collection($slug);
        $mapping = $this->mapper->map($collection, null, 0, $primary->code(), $primary->version(), '', '', CarbonImmutable::now('UTC'));

        $sections = [];

        foreach ($collection->sections as $section) {
            $sections[$section->key] = [];
        }

        $bookNumbers = [];

        foreach ($mapping->plan->books as $book) {
            $bookNumbers[(int) $book['id']] = (string) $book['book_number'];
        }

        foreach ($mapping->plan->entries as $entry) {
            $bookNumber = $bookNumbers[(int) $entry['book_id']] ?? null;

            if ($bookNumber !== null) {
                $sections[$bookNumber][] = (string) $entry['hadith_number'];
            }
        }

        $bookSlug = (string) config('hadith.title_match.books.'.$slug);
        $chapters = $this->client->chapters($bookSlug);
        $refs = $this->client->hadithRefs($bookSlug);

        $chapterTitles = [];
        $unnumberedChapters = 0;
        $duplicateNumbers = [];

        foreach ($chapters as $chapter) {
            if ($chapter->chapterNumber === null) {
                $unnumberedChapters++;

                continue;
            }

            if (isset($duplicateNumbers[$chapter->chapterNumber])) {
                continue;
            }

            if (array_key_exists($chapter->chapterNumber, $chapterTitles)) {
                unset($chapterTitles[$chapter->chapterNumber]);
                $duplicateNumbers[$chapter->chapterNumber] = true;

                continue;
            }

            $chapterTitles[$chapter->chapterNumber] = $chapter->titleAr;
        }

        $pairs = [];
        $chaptersByNumber = [];

        foreach ($refs as $ref) {
            $pairs[] = ['number' => $ref->hadithNumber, 'chapter_number' => $ref->chapterNumber];
            $chaptersByNumber[$ref->hadithNumber][$ref->chapterNumber] = true;
        }

        $ambiguous = 0;

        foreach ($chaptersByNumber as $numberChapters) {
            if (count($numberChapters) > 1) {
                $ambiguous++;
            }
        }

        $matches = $this->matcher->match($sections, $pairs, $chapterTitles, (int) config('hadith.title_match.threshold_percent', 95));

        $mappingErrors = 0;

        foreach ($mapping->issues as $issue) {
            if ($issue->severity === 'error') {
                $mappingErrors++;
            }
        }

        return new CollectionProposal(
            slug: $slug,
            bookSlug: $bookSlug,
            matches: $matches,
            mappingErrors: $mappingErrors,
            hadithapiChapters: count($chapters),
            hadithapiHadith: count($refs),
            ambiguousNumbers: $ambiguous,
            unnumberedChapters: $unnumberedChapters,
            duplicateChapterNumbers: count($duplicateNumbers),
        );
    }
}

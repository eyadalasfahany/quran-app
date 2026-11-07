<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Services\HadithExtraBooks;
use App\Domains\Hadith\Services\HadithRangeCorrections;
use App\Domains\Hadith\Sources\Records\SourceCollection;
use App\Domains\Hadith\Sources\Records\SourceHadith;
use App\Domains\Hadith\Sources\Records\SourceSection;

/**
 * Applies the committed gaps file of a collection to its source (ADR 0076, steps 6b.3 and 6b.4). Read-only and free of database
 * access: the importer passes the origin ids it resolved. Returns null when the collection has no gaps file. A fill that contains
 * markup is refused (ADR 0076 Q2): its number stays unknown and the mapper reports it.
 */
final class HadithOverlayBuilder
{
    private const string MARKUP_PATTERN = '~<[^<>]*>~u';

    public function __construct(
        private readonly HadithDataFiles $dataFiles,
        private readonly HadithRangeCorrections $corrections,
        private readonly HadithExtraBooks $extraBooks,
    ) {}

    /**
     * @param  array<string, int>  $originSourceIds  origin code => content_sources.id, for the origins the file names
     *
     * @throws HadithDataFileException with a code in the message, never content
     * @throws \LogicException When the file names an origin whose content_sources row is not seeded
     */
    public function build(string $slug, SourceCollection $source, array $originSourceIds): ?HadithOverlay
    {
        $file = $this->dataFiles->gaps($slug);

        if (! $file instanceof GapFile) {
            return null;
        }

        foreach (array_keys($file->origins) as $origin) {
            if (! isset($originSourceIds[$origin])) {
                throw new \LogicException('The source ['.$origin.'] must be seeded before a Hadith import.');
            }
        }

        $hadiths = [];

        foreach ($source->hadiths as $hadith) {
            $hadiths[$hadith->number] = $hadith;
        }

        $fills = [];
        $refusedFills = [];

        foreach ($file->fills as $fill) {
            $target = $hadiths[$fill->number] ?? null;

            if (! $target instanceof SourceHadith) {
                throw new HadithDataFileException('Fill of ['.$slug.' '.$fill->number.'] names a number the edition does not have (fill_target_missing).');
            }

            if ($this->hasText($target)) {
                throw new HadithDataFileException('Fill of ['.$slug.' '.$fill->number.'] names a number that already has text (fill_target_has_text).');
            }

            if (preg_match(self::MARKUP_PATTERN, $fill->text) === 1) {
                $refusedFills[] = $fill->number;

                continue;
            }

            $fills[$fill->number] = $fill;
        }

        $merges = [];

        foreach ($file->merges as $merge) {
            $this->assertMerge($slug, $merge, $hadiths, $fills);
            $merges[$merge->number] = $merge->into;
        }

        return new HadithOverlay(
            merges: $merges,
            originSourceIds: array_intersect_key($originSourceIds, $file->origins),
            originVersions: $file->origins,
            fills: $fills,
            books: $this->books($slug, $source, $file->books),
            refusedFills: $refusedFills,
        );
    }

    /**
     * @param  array<string, SourceHadith>  $hadiths
     * @param  array<string, GapFill>  $fills
     *
     * @throws HadithDataFileException
     */
    private function assertMerge(string $slug, GapMerge $merge, array $hadiths, array $fills): void
    {
        $label = $slug.' '.$merge->number;

        if (! isset($hadiths[$merge->number])) {
            throw new HadithDataFileException('Merge of ['.$label.'] names a number the edition does not have (merge_number_unknown).');
        }

        if ($this->hasText($hadiths[$merge->number])) {
            throw new HadithDataFileException('Merge of ['.$label.'] names a number that has text (merge_number_has_text).');
        }

        if ($merge->into === $merge->number) {
            throw new HadithDataFileException('Merge of ['.$label.'] points at itself (merge_into_self).');
        }

        if (! isset($hadiths[$merge->into])) {
            throw new HadithDataFileException('Merge of ['.$label.'] names a covering number the edition does not have (merge_target_missing).');
        }

        $coveringHasText = $this->hasText($hadiths[$merge->into]) || isset($fills[$merge->into]);

        if (! $coveringHasText) {
            throw new HadithDataFileException('Merge of ['.$label.'] points at a covering number with no text (merge_target_missing).');
        }
    }

    /**
     * The extra books, validated against config and against the sections after range corrections (ADR 0076 decision 4).
     *
     * @param  list<GapBook>  $books
     * @return list<GapBook>
     *
     * @throws HadithDataFileException
     */
    private function books(string $slug, SourceCollection $source, array $books): array
    {
        $declared = array_map(
            static fn (GapBook $book): array => [$book->bookNumber, $book->afterBook, $book->first, $book->last],
            $books,
        );
        $configured = array_map(
            static fn (array $book): array => [$book['book_number'], $book['after_book'], $book['first'], $book['last']],
            $this->extraBooks->forSlug($slug),
        );

        if ($declared !== $configured) {
            throw new HadithDataFileException('The books of ['.$slug.'] in the gaps file differ from config hadith.extra_books (book_mismatch_with_config).');
        }

        if ($books === []) {
            return [];
        }

        $sections = $this->corrections->apply($slug, $source->sections)['sections'];

        foreach ($books as $book) {
            if ($book->bookNumber === null) {
                throw new HadithDataFileException('The book of ['.$slug.'] after ['.$book->afterBook.'] has no decided book number (book_number_undecided).');
            }

            foreach ($sections as $section) {
                if ($section->key === $book->bookNumber) {
                    throw new HadithDataFileException('The book number ['.$book->bookNumber.'] of ['.$slug.'] already exists (book_key_exists).');
                }
            }

            $position = null;

            foreach ($sections as $index => $section) {
                if ($section->key === $book->afterBook) {
                    $position = $index;
                }
            }

            if ($position === null) {
                throw new HadithDataFileException('The book of ['.$slug.'] is placed after an unknown section (book_after_unknown).');
            }

            $new = new SourceSection($book->bookNumber, null, $book->first, $book->last, null, null);

            foreach ($sections as $section) {
                if ($this->overlaps($new, $section)) {
                    throw new HadithDataFileException('The range of the book ['.$book->bookNumber.'] of ['.$slug.'] overlaps another section (book_range_overlaps).');
                }
            }

            array_splice($sections, $position + 1, 0, [$new]);
        }

        return $books;
    }

    private function overlaps(SourceSection $book, SourceSection $section): bool
    {
        if ($section->firstHadithNumber === null || $section->lastHadithNumber === null || ! is_numeric($section->firstHadithNumber) || ! is_numeric($section->lastHadithNumber)) {
            return false;
        }

        return (float) $book->firstHadithNumber <= (float) $section->lastHadithNumber
            && (float) $section->firstHadithNumber <= (float) $book->lastHadithNumber;
    }

    private function hasText(SourceHadith $hadith): bool
    {
        return $hadith->text !== null && $hadith->text !== '';
    }
}

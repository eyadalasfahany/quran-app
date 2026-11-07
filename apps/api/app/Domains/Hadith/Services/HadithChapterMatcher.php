<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Services;

use App\Domains\Hadith\Import\Records\MappingResult;
use App\Domains\Hadith\Overlay\ChapterAlignment;
use App\Domains\Hadith\Overlay\HadithWordSet;
use App\Domains\Hadith\Overlay\OpenItiChapter;
use App\Domains\Hadith\Overlay\OpenItiTextCleaner;
use App\Domains\Hadith\Overlay\OpenItiUnit;

/**
 * hadith:match-chapters (ADR 0076 §5, brief 9.3, step 6b.7). Decides, per OpenITI chapter, whether it matches the collection's
 * rows: one book, a 95% forward text check and a 95% backward coverage check, both with integer math. Then option C per book.
 * Pure: the mapping and the scanned chapters go in, a proposal and a report come out. It stores no text and prints none.
 */
final class HadithChapterMatcher
{
    public const int MATCHER_VERSION = 1;

    private const float MATCH_THRESHOLD = 0.5;

    private const int SMALL_CHAPTER_MAX = 19;

    private const string RESIDUAL_PATTERN = '%[#~|$]|PageV|ms[0-9]%';

    public function __construct(private readonly OpenItiTextCleaner $cleaner) {}

    /**
     * @param  list<OpenItiChapter>  $chapters  the scanned chapters with units, in OpenITI order
     * @param  array<string, int>  $census  the line-shape census of the scan
     * @param  array{release: string, doi: string, version_id: string, source_file_sha256: string, licence: string}  $meta
     * @param  ?ChapterAlignment  $alignment  the pinned unit => number alignment; null keeps each unit's own number (no alignment file)
     * @param  int  $pageMarkerHeadings  headings skipped because they hold only page markers (ADR 0076 §3)
     */
    public function match(string $slug, MappingResult $mapping, array $chapters, int $headingsWithoutUnits, array $census, string $partialBooks, array $meta, ?ChapterAlignment $alignment = null, int $pageMarkerHeadings = 0): ChapterMatchResult
    {
        $context = $this->context($mapping);
        $decisions = [];
        $ordinalByBook = [];

        foreach ($chapters as $chapter) {
            $numbers = $this->listedNumbers($chapter, $alignment);
            $present = array_values(array_filter($numbers, static fn (string $number): bool => isset($context['entryByNumber'][$number])));
            $book = $present === [] ? null : $context['bookOfNumber'][$present[0]];
            $key = $book ?? '';
            $ordinal = ($ordinalByBook[$key] ?? 0) + 1;
            $ordinalByBook[$key] = $ordinal;
            $decisions[] = $this->judge($chapter, $book, $ordinal, $numbers, $present, $context, $alignment);
        }

        $coverage = $this->coverage($context, $decisions);
        $proposal = $this->proposal($slug, $mapping, $decisions, $coverage, $partialBooks, $meta);

        return new ChapterMatchResult($proposal['json'], $this->report($slug, $decisions, $coverage, $partialBooks, $census, $headingsWithoutUnits, $proposal['sha256'], $meta, $alignment?->count(), $pageMarkerHeadings));
    }

    /**
     * The entries indexed for the matcher: by number, by book (in position order), and each number's book.
     *
     * @return array{entries: list<array<string, int|string|null>>, entryByNumber: array<string, int>, bookOfNumber: array<string, string>, bookEntries: array<string, list<int>>, bookOrder: list<string>}
     */
    private function context(MappingResult $mapping): array
    {
        $entries = $mapping->plan->entries;
        $bookNumberById = [];
        $bookOrder = [];

        foreach ($mapping->plan->books as $book) {
            $bookNumberById[(int) $book['id']] = (string) $book['book_number'];
            $bookOrder[] = (string) $book['book_number'];
        }

        $entryByNumber = [];
        $bookOfNumber = [];
        $bookEntries = [];

        foreach ($entries as $index => $entry) {
            $number = (string) $entry['hadith_number'];
            $book = $bookNumberById[(int) $entry['book_id']];
            $entryByNumber[$number] = $index;
            $bookOfNumber[$number] = $book;
            $bookEntries[$book][] = $index;
        }

        foreach ($bookEntries as $book => $indexes) {
            usort($indexes, static fn (int $first, int $second): int => (int) $entries[$first]['position'] <=> (int) $entries[$second]['position']);
            $bookEntries[$book] = $indexes;
        }

        return ['entries' => $entries, 'entryByNumber' => $entryByNumber, 'bookOfNumber' => $bookOfNumber, 'bookEntries' => $bookEntries, 'bookOrder' => $bookOrder];
    }

    /**
     * The distinct hadith numbers of a chapter in file order. A unit with no number (no alignment entry, or no own number when
     * there is no alignment) is not listed.
     *
     * @return list<string>
     */
    private function listedNumbers(OpenItiChapter $chapter, ?ChapterAlignment $alignment): array
    {
        $numbers = [];

        foreach ($chapter->units as $unit) {
            $number = $this->numberOf($unit, $alignment);

            if ($number !== null && ! in_array($number, $numbers, true)) {
                $numbers[] = $number;
            }
        }

        return $numbers;
    }

    /**
     * The fawazahmed0 number of a unit: through the alignment when there is one (unaligned units have none), else the unit's own
     * number as printed in the file.
     */
    private function numberOf(OpenItiUnit $unit, ?ChapterAlignment $alignment): ?string
    {
        if ($alignment !== null) {
            return $alignment->numberOf($unit->index);
        }

        return $unit->number === null ? null : (string) $unit->number;
    }

    /**
     * Applies the rules of brief 9.3 in order and returns the decision row. The first failing rule is the result.
     *
     * @param  list<string>  $numbers
     * @param  list<string>  $present
     * @param  array{entries: list<array<string, int|string|null>>, entryByNumber: array<string, int>, bookOfNumber: array<string, string>, bookEntries: array<string, list<int>>, bookOrder: list<string>}  $context
     * @return array<string, mixed>
     */
    private function judge(OpenItiChapter $chapter, ?string $book, int $ordinal, array $numbers, array $present, array $context, ?ChapterAlignment $alignment): array
    {
        $row = [
            'book_number' => $book,
            'ordinal' => $ordinal,
            'n' => count($numbers),
            'n_listed' => count($present),
            'listed_without_text' => count($numbers) - count($present),
            'forward_passed' => 0,
            'forward_required' => intdiv(95 * count($present) + 99, 100),
            'backward_c' => 0,
            'backward_m' => 0,
            'backward_required' => 0,
            'first' => null,
            'last' => null,
            'lo' => null,
            'hi' => null,
            'title' => $chapter->title,
            'had_continuation' => $chapter->hadContinuation,
            'numbering_stripped' => $chapter->numberingStripped,
            'result' => 'accepted',
        ];

        if ($chapter->title === '') {
            return ['result' => 'empty_title'] + $row;
        }

        if ($present === []) {
            return ['result' => 'no_listed_text'] + $row;
        }

        $books = [];

        foreach ($present as $number) {
            $books[$context['bookOfNumber'][$number]] = true;
        }

        if (count($books) > 1) {
            return ['result' => 'crosses_books'] + $row;
        }

        $book = (string) array_key_first($books);
        $row['book_number'] = $book;
        $row['forward_passed'] = $this->forwardPassed($chapter, $present, $context['entries'], $context['entryByNumber'], $alignment);

        if ($row['forward_passed'] < $row['forward_required']) {
            return ['result' => 'forward_below_threshold'] + $row;
        }

        $bookIndexes = $context['bookEntries'][$book];
        $positionOf = array_flip($bookIndexes);
        $positions = [];

        foreach ($present as $number) {
            $positions[] = $positionOf[$context['entryByNumber'][$number]];
        }

        $lo = min($positions);
        $hi = max($positions);
        $window = array_slice($bookIndexes, $lo, $hi - $lo + 1);
        $listed = array_fill_keys($present, true);
        $row['backward_c'] = count(array_filter($window, static fn (int $index): bool => isset($listed[(string) $context['entries'][$index]['hadith_number']])));
        $row['backward_m'] = count($window);
        $row['backward_required'] = intdiv(95 * $row['backward_m'] + 99, 100);
        $row['first'] = (string) $context['entries'][$window[0]]['hadith_number'];
        $row['last'] = (string) $context['entries'][$window[count($window) - 1]]['hadith_number'];
        $row['lo'] = $lo;
        $row['hi'] = $hi;

        if ($row['backward_c'] < $row['backward_required']) {
            return ['result' => 'backward_below_threshold'] + $row;
        }

        return $row;
    }

    /**
     * The forward check: how many listed numbers have a unit whose cleaned text shares at least half its words with the entry.
     *
     * @param  list<string>  $present
     * @param  list<array<string, int|string|null>>  $entries
     * @param  array<string, int>  $entryByNumber
     */
    private function forwardPassed(OpenItiChapter $chapter, array $present, array $entries, array $entryByNumber, ?ChapterAlignment $alignment): int
    {
        $unitByNumber = $this->firstUnitByNumber($chapter->units, $alignment);
        $passed = 0;

        foreach ($present as $number) {
            $unit = $unitByNumber[$number];
            $unitWords = HadithWordSet::of($this->cleaner->clean($unit->lines, $unit->markerEnd));
            $entryWords = HadithWordSet::of((string) $entries[$entryByNumber[$number]]['text_ar']);

            if (HadithWordSet::jaccard($unitWords, $entryWords) >= self::MATCH_THRESHOLD) {
                $passed++;
            }
        }

        return $passed;
    }

    /**
     * @param  list<OpenItiUnit>  $units
     * @return array<array-key, OpenItiUnit> the first unit of each number
     */
    private function firstUnitByNumber(array $units, ?ChapterAlignment $alignment): array
    {
        $byNumber = [];

        foreach ($units as $unit) {
            $number = $this->numberOf($unit, $alignment);

            if ($number !== null && ! isset($byNumber[$number])) {
                $byNumber[$number] = $unit;
            }
        }

        return $byNumber;
    }

    /**
     * Option C (ADR 0076 §7): the entries of each book that the accepted chapters cover, by position, and whether the book is
     * complete.
     *
     * @param  array{entries: list<array<string, int|string|null>>, entryByNumber: array<string, int>, bookOfNumber: array<string, string>, bookEntries: array<string, list<int>>, bookOrder: list<string>}  $context
     * @param  list<array<string, mixed>>  $decisions
     * @return array<string, array{entries_total: int, entries_covered: int, complete: bool}>
     */
    private function coverage(array $context, array $decisions): array
    {
        $covered = [];

        foreach ($decisions as $decision) {
            if ($decision['result'] !== 'accepted' || $decision['book_number'] === null) {
                continue;
            }

            for ($position = $decision['lo']; $position <= $decision['hi']; $position++) {
                $covered[$decision['book_number']][$position] = true;
            }
        }

        $books = [];

        foreach ($context['bookEntries'] as $book => $indexes) {
            $total = count($indexes);
            $done = count($covered[$book] ?? []);
            $books[$book] = ['entries_total' => $total, 'entries_covered' => $done, 'complete' => $total > 0 && $done === $total];
        }

        return $books;
    }

    /**
     * The chapters file (brief 7.2 schema, no text): drop keeps only the accepted chapters of complete books; keep keeps all of them.
     *
     * @param  list<array<string, mixed>>  $decisions
     * @param  array<string, array{entries_total: int, entries_covered: int, complete: bool}>  $coverage
     * @param  array{release: string, doi: string, version_id: string, source_file_sha256: string, licence: string}  $meta
     * @return array{json: string, sha256: string}
     */
    private function proposal(string $slug, MappingResult $mapping, array $decisions, array $coverage, string $partialBooks, array $meta): array
    {
        $bookOrder = [];

        foreach ($mapping->plan->books as $book) {
            $bookOrder[(string) $book['book_number']] = count($bookOrder);
        }

        $rows = [];

        foreach ($this->kept($decisions, $coverage, $partialBooks) as $decision) {
            $rows[] = ['ordinal' => $decision['ordinal'], 'book_number' => $decision['book_number'], 'first' => $decision['first'], 'last' => $decision['last'], 'title_ar' => $decision['title']];
        }

        usort($rows, static fn (array $first, array $second): int => ($bookOrder[$first['book_number']] <=> $bookOrder[$second['book_number']]) ?: $first['ordinal'] <=> $second['ordinal']);

        $document = [
            'schema_version' => 1,
            'collection' => $slug,
            'source' => 'openiti',
            'release' => $meta['release'],
            'doi' => $meta['doi'],
            'version_id' => $meta['version_id'],
            'source_file_sha256' => $meta['source_file_sha256'],
            'matcher_version' => (string) self::MATCHER_VERSION,
            'partial_books' => $partialBooks,
            'licence' => $meta['licence'],
            'chapters' => $rows,
        ];
        $json = json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";

        return ['json' => $json, 'sha256' => hash('sha256', $json)];
    }

    /**
     * @param  list<array<string, mixed>>  $decisions
     * @param  array<string, array{entries_total: int, entries_covered: int, complete: bool}>  $coverage
     * @return list<array<string, mixed>>
     */
    private function kept(array $decisions, array $coverage, string $partialBooks): array
    {
        $kept = [];

        foreach ($decisions as $decision) {
            if ($decision['result'] !== 'accepted' || $decision['book_number'] === null) {
                continue;
            }

            if ($partialBooks === 'drop' && ! ($coverage[$decision['book_number']]['complete'] ?? false)) {
                continue;
            }

            $kept[] = $decision;
        }

        return $kept;
    }

    /**
     * Counts, numbers and codes only: no text and no titles.
     *
     * @param  list<array<string, mixed>>  $decisions
     * @param  array<string, array{entries_total: int, entries_covered: int, complete: bool}>  $coverage
     * @param  array<string, int>  $census
     * @param  array{release: string, doi: string, version_id: string, source_file_sha256: string, licence: string}  $meta
     * @return array<string, mixed>
     */
    private function report(string $slug, array $decisions, array $coverage, string $partialBooks, array $census, int $headingsWithoutUnits, string $proposalSha, array $meta, ?int $alignedUnits, int $pageMarkerHeadings): array
    {
        $byResult = [];
        $small = ['accepted' => 0, 'rejected' => 0];
        $listedTotal = 0;
        $passedTotal = 0;
        $continuation = 0;
        $residual = 0;
        $empty = 0;
        $numbered = 0;

        foreach ($decisions as $decision) {
            $byResult[$decision['result']] = ($byResult[$decision['result']] ?? 0) + 1;
            $listedTotal += $decision['n_listed'];
            $passedTotal += $decision['forward_passed'];
            $continuation += $decision['had_continuation'] ? 1 : 0;
            $residual += preg_match(self::RESIDUAL_PATTERN, (string) $decision['title']) === 1 ? 1 : 0;
            $empty += $decision['title'] === '' ? 1 : 0;
            $numbered += $decision['numbering_stripped'] ? 1 : 0;

            if ($decision['n'] <= self::SMALL_CHAPTER_MAX) {
                $small[$decision['result'] === 'accepted' ? 'accepted' : 'rejected']++;
            }
        }

        $accepted = count(array_filter($decisions, static fn (array $decision): bool => $decision['result'] === 'accepted'));
        $keptDrop = $this->kept($decisions, $coverage, 'drop');
        $keptBooks = array_values(array_unique(array_map(static fn (array $decision): string => (string) $decision['book_number'], $keptDrop)));

        return [
            'collection' => $slug,
            'matcher_version' => self::MATCHER_VERSION,
            'partial_books' => $partialBooks,
            'source_file_sha256' => $meta['source_file_sha256'],
            'proposal_sha256' => $proposalSha,
            'census' => $census,
            'chapters_parsed' => count($decisions),
            'headings_without_units' => $headingsWithoutUnits,
            'page_marker_headings' => $pageMarkerHeadings,
            'decisions' => array_map(static fn (array $decision): array => [
                'book_number' => $decision['book_number'],
                'ordinal' => $decision['ordinal'],
                'n' => $decision['n'],
                'n_listed' => $decision['n_listed'],
                'listed_without_text' => $decision['listed_without_text'],
                'forward_passed' => $decision['forward_passed'],
                'forward_required' => $decision['forward_required'],
                'backward_c' => $decision['backward_c'],
                'backward_m' => $decision['backward_m'],
                'backward_required' => $decision['backward_required'],
                'result' => $decision['result'],
            ], $decisions),
            'accepted' => $accepted,
            'rejected' => count($decisions) - $accepted,
            'by_result' => $byResult,
            'small_chapters' => $small,
            'text_check' => ['listed' => $listedTotal, 'passed' => $passedTotal, 'rate' => $listedTotal === 0 ? 0.0 : round($passedTotal / $listedTotal, 4)],
            'coverage' => $coverage,
            'drop' => ['books_kept' => count($keptBooks), 'chapters' => count($keptDrop)],
            'keep' => ['chapters' => $accepted],
            'titles_with_continuation' => $continuation,
            'titles_with_residual_markers' => $residual,
            'titles_empty' => $empty,
            'titles_numbering_stripped' => $numbered,
            'alignment_units' => $alignedUnits,
        ];
    }
}

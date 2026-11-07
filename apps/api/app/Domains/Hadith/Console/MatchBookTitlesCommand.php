<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Console;

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithGapBuildException;
use App\Domains\Hadith\Import\Records\SectionMatch;
use App\Domains\Hadith\Services\HadithBookTitleMatcher;
use App\Domains\Hadith\Services\HadithOpenItiInputs;
use App\Domains\Hadith\Services\OpenItiCollectionInputs;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Dev only (ADR 0042 §4a, ADR 0076): proposes Arabic book titles from OpenITI book headings for the fawazahmed0 sections that have no
 * hadithapi.com title, under the two-way 95% rule. Writes storage/app/hadith/proposals/book-titles.json (counts, a paste block and
 * the accepted titles). Never writes config/ or database/. Refused in production before any file is read.
 */
final class MatchBookTitlesCommand extends Command
{
    /** @var list<string> */
    private const array DEFAULT_SLUGS = ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'ibnmajah', 'nasai', 'malik'];

    protected $signature = 'hadith:match-book-titles
        {--collection=* : Canonical slug (repeatable; default the seven multi-book collections)}
        {--openiti-dir= : Folder that holds the pinned OpenITI files (default config hadith.openiti.dir under storage/)}';

    protected $description = 'Dev only: propose Arabic book titles from OpenITI book headings for sections with no hadithapi.com title (two-way 95% rule). Writes a proposal under storage/app, never config/.';

    public function handle(HadithOpenItiInputs $inputs, HadithBookTitleMatcher $matcher): int
    {
        if (app()->isProduction()) {
            $this->error('hadith:match-book-titles is a developer tool and is disabled in production.');

            return self::FAILURE;
        }

        $openitiDir = $this->option('openiti-dir');
        $openitiDir = is_string($openitiDir) && $openitiDir !== '' ? $openitiDir : storage_path((string) config('hadith.openiti.dir'));

        $requested = array_values(array_unique(array_map('strval', (array) $this->option('collection'))));
        $slugs = $requested === [] ? self::DEFAULT_SLUGS : $requested;
        $known = array_map('strval', (array) config('hadith.collections'));

        foreach ($slugs as $slug) {
            if (! in_array($slug, $known, true)) {
                $this->error('Unknown collection ['.$slug.']. Use one of: '.implode(', ', $known).'.');

                return self::FAILURE;
            }
        }

        $collections = [];
        $paste = [];

        foreach ($slugs as $slug) {
            try {
                $loaded = $inputs->load($slug, $openitiDir);
            } catch (HadithGapBuildException|HadithDataFileException|\LogicException $exception) {
                $this->error('['.$slug.'] '.$exception->getMessage());

                return self::FAILURE;
            }

            $titled = array_map('strval', array_keys((array) config('hadith_titles.sections.'.$slug, [])));
            $matches = $matcher->match($this->sectionsOf($loaded), $this->booksOf($loaded), $titled, (int) config('hadith.title_match.threshold_percent', 95));
            $collections[$slug] = $this->collectionEntry($loaded, $matches, $titled);
            $paste[$slug] = $this->pasteBlock($matches);

            $this->line(sprintf('[%s] %d accepted, %d rejected (%d sections without a hadithapi.com title; %d OpenITI books)', $slug, $collections[$slug]['accepted_count'], $collections[$slug]['rejected_count'], count($matches), count($this->booksOf($loaded))));
        }

        $outputPath = storage_path('app/hadith/proposals/book-titles.json');
        File::ensureDirectoryExists(dirname($outputPath));
        File::put($outputPath, json_encode([
            'generated_at' => CarbonImmutable::now('UTC')->toIso8601ZuluString('millisecond'),
            'source' => 'openiti',
            'release' => (string) config('hadith.openiti.release'),
            'threshold_percent' => (int) config('hadith.title_match.threshold_percent', 95),
            'collections' => (object) $collections,
            'paste' => (object) $paste,
        ], JSON_PRETTY_PRINT | JSON_PRESERVE_ZERO_FRACTION | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        $this->line('Proposal written to: '.$outputPath);
        $this->line('This command never writes config/. Review the proposal and append its "paste" block to config/hadith_titles.php under \'sections\'.');

        return self::SUCCESS;
    }

    /**
     * The fawazahmed0 sections: book number => its hadith numbers that have text.
     *
     * @return array<string, list<string>>
     */
    private function sectionsOf(OpenItiCollectionInputs $loaded): array
    {
        $bookNumbers = [];

        foreach ($loaded->mapping->plan->books as $book) {
            $bookNumbers[(int) $book['id']] = (string) $book['book_number'];
        }

        $sections = [];

        foreach ($loaded->mapping->plan->books as $book) {
            $sections[(string) $book['book_number']] = [];
        }

        foreach ($loaded->mapping->plan->entries as $entry) {
            $bookNumber = $bookNumbers[(int) $entry['book_id']] ?? null;

            if ($bookNumber !== null) {
                $sections[$bookNumber][] = (string) $entry['hadith_number'];
            }
        }

        return $sections;
    }

    /**
     * The OpenITI book headings in file order: the ordinal, the title and the distinct numbers its units map to that have text.
     *
     * @return list<array{ordinal: int, title: string, numbers: list<string>}>
     */
    private function booksOf(OpenItiCollectionInputs $loaded): array
    {
        $withText = [];

        foreach ($loaded->mapping->plan->entries as $entry) {
            $withText[(string) $entry['hadith_number']] = true;
        }

        $books = [];

        foreach ($loaded->scan->books as $position => $book) {
            $numbers = [];

            foreach ($book->units as $unit) {
                $number = $loaded->numberOf($unit);

                if ($number !== null && isset($withText[$number]) && ! in_array($number, $numbers, true)) {
                    $numbers[] = $number;
                }
            }

            if ($book->title === '' || $numbers === []) {
                continue;
            }

            $books[] = ['ordinal' => $position + 1, 'title' => $book->title, 'numbers' => $numbers];
        }

        return $books;
    }

    /**
     * @param  list<SectionMatch>  $matches
     * @param  list<string>  $titled
     * @return array<string, mixed>
     */
    private function collectionEntry(OpenItiCollectionInputs $loaded, array $matches, array $titled): array
    {
        $accepted = [];
        $rejected = [];
        $byReason = [];

        foreach ($matches as $match) {
            $byReason[$match->reason] = ($byReason[$match->reason] ?? 0) + 1;

            if ($match->accepted) {
                $accepted[$match->bookNumber] = [
                    'title_ar' => $match->titleAr,
                    'title_ar_source' => 'openiti',
                    'openiti_book_key' => $match->chapterNumber,
                    'forward' => ['matched' => $match->forwardMatched, 'total' => $match->sectionSize],
                    'backward' => ['matched' => $match->backwardMatched, 'total' => $match->chapterSize],
                ];
            } else {
                $rejected[$match->bookNumber] = ['reason' => $match->reason];
            }
        }

        return [
            'titled_sections_skipped' => count($titled),
            'sections_proposed' => count($matches),
            'openiti_books' => count($loaded->scan->books),
            'accepted_count' => count($accepted),
            'rejected_count' => count($rejected),
            'by_reason' => $byReason,
            'accepted' => (object) $accepted,
            'rejected' => (object) $rejected,
        ];
    }

    /**
     * @param  list<SectionMatch>  $matches
     */
    private function pasteBlock(array $matches): object
    {
        $block = [];

        foreach ($matches as $match) {
            if ($match->accepted) {
                $block[$match->bookNumber] = ['title_ar' => $match->titleAr, 'title_ar_source' => 'openiti'];
            }
        }

        return (object) $block;
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Console;

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithGapBuildException;
use App\Domains\Hadith\Services\ChapterMatchResult;
use App\Domains\Hadith\Services\HadithChapterMatcher;
use App\Domains\Hadith\Services\HadithOpenItiInputs;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Dev only (ADR 0076 §5, step 6b.7): proposes the OpenITI chapters of the first four collections (Bukhari, Abu Dawud, Nasa'i,
 * Ibn Majah) against the importer's own mapping, and writes a chapters-file proposal and a report under storage/app. Refused in
 * production before any file is read. Muslim and Malik map their units through the pinned alignment file when one exists. The
 * developer commits the proposal in step 6b.8.
 */
final class MatchChaptersCommand extends Command
{
    /** @var list<string> */
    private const array DEFAULT_SLUGS = ['bukhari', 'abudawud', 'nasai', 'ibnmajah'];

    protected $signature = 'hadith:match-chapters
        {--collection=* : Canonical slug (repeatable; default the four collections with chapter markup)}
        {--openiti-dir= : Folder that holds the pinned OpenITI files (default config hadith.openiti.dir under storage/)}
        {--partial-books=drop : drop (option C) or keep (Q5)}';

    protected $description = 'Dev only: propose the OpenITI chapters of the first four collections against the importer mapping. Writes under storage/app, never config/ or database/.';

    public function handle(HadithOpenItiInputs $inputs, HadithChapterMatcher $matcher): int
    {
        if (app()->isProduction()) {
            $this->error('hadith:match-chapters is a developer tool and is disabled in production.');

            return self::FAILURE;
        }

        $openitiDir = $this->option('openiti-dir');
        $openitiDir = is_string($openitiDir) && $openitiDir !== '' ? $openitiDir : storage_path((string) config('hadith.openiti.dir'));

        $partialBooks = (string) $this->option('partial-books');

        if (! in_array($partialBooks, ['drop', 'keep'], true)) {
            $this->error('--partial-books must be drop or keep.');

            return self::FAILURE;
        }

        $requested = array_values(array_unique(array_map('strval', (array) $this->option('collection'))));
        $slugs = $requested === [] ? self::DEFAULT_SLUGS : $requested;
        $directory = storage_path('app/hadith/proposals/chapters');
        File::ensureDirectoryExists($directory);

        foreach ($slugs as $slug) {
            try {
                $result = $this->matchOne($slug, $openitiDir, $partialBooks, $inputs, $matcher);
            } catch (HadithGapBuildException|HadithDataFileException|\LogicException $exception) {
                $this->error('['.$slug.'] '.$exception->getMessage());

                return self::FAILURE;
            }

            File::put($directory.'/'.$slug.'.json', $result->proposalJson);
            File::put($directory.'/'.$slug.'.report.json', json_encode($result->report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n");

            $this->line('['.$slug.'] proposal written; proposal SHA-256 '.$result->report['proposal_sha256'].'; chapters parsed '.$result->report['chapters_parsed'].'; accepted '.$result->report['accepted'].'; rejected '.$result->report['rejected'].'; page markers skipped '.$result->report['page_marker_headings'].'.');
        }

        return self::SUCCESS;
    }

    /**
     * @throws HadithGapBuildException
     * @throws HadithDataFileException
     * @throws \LogicException
     */
    private function matchOne(string $slug, string $openitiDir, string $partialBooks, HadithOpenItiInputs $inputs, HadithChapterMatcher $matcher): ChapterMatchResult
    {
        $loaded = $inputs->load($slug, $openitiDir);

        return $matcher->match(
            $slug,
            $loaded->mapping,
            $loaded->scan->chapters,
            $loaded->scan->headingsWithoutUnits,
            $loaded->scan->census,
            $partialBooks,
            $loaded->meta,
            $loaded->alignment,
            $loaded->scan->pageMarkerHeadings,
        );
    }
}

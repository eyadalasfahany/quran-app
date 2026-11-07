<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Console;

use App\Domains\Hadith\Exceptions\HadithDataFileException;
use App\Domains\Hadith\Exceptions\HadithGapBuildException;
use App\Domains\Hadith\Overlay\HadithOverlayBuilder;
use App\Domains\Hadith\Overlay\OpenItiChapterReader;
use App\Domains\Hadith\Repositories\Contracts\HadithImportRepository;
use App\Domains\Hadith\Services\ChapterMatchResult;
use App\Domains\Hadith\Services\HadithChapterMatcher;
use App\Domains\Hadith\Services\HadithMapper;
use App\Domains\Hadith\Sources\HadithSourceRegistry;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Dev only (ADR 0076 §5, step 6b.7): proposes the OpenITI chapters of the first four collections (Bukhari, Abu Dawud, Nasa'i,
 * Ibn Majah) against the importer's own mapping, and writes a chapters-file proposal and a report under storage/app. Refused in
 * production before any file is read. The developer commits the proposal in step 6b.8.
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

    public function handle(HadithSourceRegistry $sources, HadithOverlayBuilder $overlays, HadithMapper $mapper, OpenItiChapterReader $reader, HadithChapterMatcher $matcher, HadithImportRepository $repository): int
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
                $result = $this->matchOne($slug, $openitiDir, $partialBooks, $sources, $overlays, $mapper, $reader, $matcher, $repository);
            } catch (HadithGapBuildException|HadithDataFileException|\LogicException $exception) {
                $this->error('['.$slug.'] '.$exception->getMessage());

                return self::FAILURE;
            }

            File::put($directory.'/'.$slug.'.json', $result->proposalJson);
            File::put($directory.'/'.$slug.'.report.json', json_encode($result->report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n");

            $this->line('['.$slug.'] proposal written; proposal SHA-256 '.$result->report['proposal_sha256'].'; chapters parsed '.$result->report['chapters_parsed'].'; accepted '.$result->report['accepted'].'; rejected '.$result->report['rejected'].'.');
        }

        return self::SUCCESS;
    }

    /**
     * @throws HadithGapBuildException
     * @throws HadithDataFileException
     * @throws \LogicException
     */
    private function matchOne(string $slug, string $openitiDir, string $partialBooks, HadithSourceRegistry $sources, HadithOverlayBuilder $overlays, HadithMapper $mapper, OpenItiChapterReader $reader, HadithChapterMatcher $matcher, HadithImportRepository $repository): ChapterMatchResult
    {
        $file = config('hadith.openiti.files.'.$slug);

        if (! is_array($file) || ! is_array($file['markup'] ?? null)) {
            throw new HadithGapBuildException('Config [hadith.openiti.files] has no chapter markup for ['.$slug.'] (markup_missing).');
        }

        $path = $openitiDir.'/'.basename((string) $file['path']);
        $bytes = is_file($path) ? file_get_contents($path) : false;

        if ($bytes === false) {
            throw new HadithGapBuildException('The OpenITI file of ['.$slug.'] is missing in the given folder (openiti_file_missing).');
        }

        if (! hash_equals((string) $file['sha256'], hash('sha256', $bytes))) {
            throw new HadithGapBuildException('The OpenITI file of ['.$slug.'] differs from its pin (openiti_sha_mismatch).');
        }

        $scan = $reader->scan($bytes, (string) $file['unit_start'], (string) $file['unit_stop'], $file['markup']['chapter'] ?? null, $file['markup']['book'] ?? null);
        $primary = $sources->primary();
        $content = $repository->source($primary->code());

        if ($content === null) {
            throw new \LogicException('The source ['.$primary->code().'] must be seeded before a chapter match.');
        }

        $originIds = [];

        foreach (['openiti', 'hadithapicom', 'meeatif', 'hadithjson'] as $code) {
            $source = $repository->source($code);

            if ($source !== null) {
                $originIds[$code] = (int) $source->getKey();
            }
        }

        $collection = $primary->collection($slug);
        $overlay = $overlays->build($slug, $collection, $originIds);
        $mapping = $mapper->map($collection, null, (int) $content->getKey(), $primary->code(), $primary->version(), (string) $content->attribution_ar, (string) $content->attribution_en, CarbonImmutable::now('UTC'), $overlay);

        return $matcher->match(
            $slug,
            $mapping,
            $scan->chapters,
            $scan->headingsWithoutUnits,
            $scan->census,
            $partialBooks,
            [
                'release' => (string) config('hadith.openiti.release'),
                'doi' => (string) config('hadith.openiti.doi'),
                'version_id' => basename((string) $file['path']),
                'source_file_sha256' => hash('sha256', $bytes),
                'licence' => 'CC BY-NC-SA 4.0, see LICENSE-NOTICE.md',
            ],
        );
    }
}

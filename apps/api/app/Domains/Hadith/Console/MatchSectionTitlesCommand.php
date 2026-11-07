<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Console;

use App\Domains\Hadith\Exceptions\HadithPinException;
use App\Domains\Hadith\Exceptions\HadithRangeCorrectionException;
use App\Domains\Hadith\Exceptions\HadithSourceFormatException;
use App\Domains\Hadith\Import\Records\CollectionProposal;
use App\Domains\Hadith\Import\Records\SectionMatch;
use App\Domains\Hadith\Services\HadithSectionTitleProposer;
use App\Integrations\HadithApiCom\HadithApiComClient;
use App\Integrations\HadithApiCom\HadithApiComConfig;
use App\Integrations\HadithApiCom\HadithApiComConfigException;
use App\Integrations\HadithApiCom\HadithApiComException;
use App\Integrations\HadithApiFawaz\HadithApiFawazException;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Dev only (ADR 0042 §4a): proposes Arabic book titles from hadithapi.com under the two-way 95% rule and writes a proposal
 * file. Never writes config/. Refused in production before any key is read or any request is made.
 *
 * It does not take the proposer by injection: resolving the proposer resolves the title config, which throws without a key,
 * so the config is checked first inside handle().
 */
final class MatchSectionTitlesCommand extends Command
{
    protected $signature = 'hadith:match-section-titles
        {--collection=* : Canonical slug to match (repeatable; default the six hadithapi.com shares)}
        {--output= : Where to write the proposal (default storage/app/hadith/proposals/section-titles.json)}';

    protected $description = 'Dev only: propose Arabic book titles from hadithapi.com under the two-way 95% rule (ADR 0042 §4a). Writes a proposal, never config/.';

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->error('hadith:match-section-titles is a developer tool and is disabled in production.');

            return self::FAILURE;
        }

        $books = $this->configuredBooks();
        $known = array_map('strval', (array) config('hadith.collections'));
        $requested = array_values(array_unique(array_map('strval', (array) $this->option('collection'))));
        $slugs = $requested === [] ? array_keys($books) : $requested;
        $selected = [];
        $skipped = [];

        foreach ($slugs as $slug) {
            $slug = (string) $slug;

            if (! in_array($slug, $known, true)) {
                $this->error('Unknown collection ['.$slug.']. Use one of: '.implode(', ', $known).'.');

                return self::FAILURE;
            }

            if (isset($books[$slug])) {
                $selected[] = $slug;
            } else {
                $skipped[$slug] = ['reason' => 'no counterpart'];
            }
        }

        try {
            HadithApiComConfig::fromConfig();
        } catch (HadithApiComConfigException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $client = app(HadithApiComClient::class);
        $proposer = app(HadithSectionTitleProposer::class);
        $proposals = [];

        try {
            foreach ($selected as $slug) {
                $proposals[] = $proposer->propose($slug);
            }
        } catch (HadithApiComException|HadithPinException|HadithSourceFormatException|HadithApiFawazException|HadithRangeCorrectionException $exception) {
            $this->error($client->redact($exception->getMessage()));

            return self::FAILURE;
        }

        $outputPath = $this->outputPath();
        $document = $this->document($proposals, $skipped);
        File::ensureDirectoryExists(dirname($outputPath));
        File::put($outputPath, json_encode($document, JSON_PRETTY_PRINT | JSON_PRESERVE_ZERO_FRACTION | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        foreach ($proposals as $proposal) {
            $accepted = 0;
            $rejected = 0;

            foreach ($proposal->matches as $match) {
                if ($match->accepted) {
                    $accepted++;
                } else {
                    $rejected++;
                }
            }

            $this->line(sprintf('Collection %s: %d accepted, %d rejected (%d sections)', $proposal->slug, $accepted, $rejected, count($proposal->matches)));
        }

        $this->line('Proposal written to: '.$outputPath);
        $this->line('This command never writes config/. Review the proposal and paste its "paste" block into config/hadith_titles.php under \'sections\'.');

        return self::SUCCESS;
    }

    /**
     * @return array<string, string>
     */
    private function configuredBooks(): array
    {
        $books = [];

        foreach ((array) config('hadith.title_match.books', []) as $canonical => $bookSlug) {
            if (is_string($canonical) && is_string($bookSlug)) {
                $books[$canonical] = $bookSlug;
            }
        }

        return $books;
    }

    private function outputPath(): string
    {
        $given = $this->option('output');

        if (is_string($given) && $given !== '') {
            return $given;
        }

        return storage_path('app/hadith/proposals/section-titles.json');
    }

    /**
     * Titles and statistics only. Every map is cast to an object so numeric book keys stay an object, never a list.
     *
     * @param  list<CollectionProposal>  $proposals
     * @param  array<string, array{reason: string}>  $skipped
     * @return array<string, mixed>
     */
    private function document(array $proposals, array $skipped): array
    {
        $collections = [];
        $paste = [];

        foreach ($proposals as $proposal) {
            $accepted = [];
            $rejected = [];
            $pasteBlock = [];

            foreach ($proposal->matches as $match) {
                if ($match->accepted) {
                    $accepted[$match->bookNumber] = $this->acceptedEntry($match);
                    $pasteBlock[$match->bookNumber] = ['title_ar' => $match->titleAr, 'title_ar_source' => 'hadithapi.com'];
                } else {
                    $rejected[$match->bookNumber] = $this->rejectedEntry($match);
                }
            }

            $collections[$proposal->slug] = [
                'book_slug' => $proposal->bookSlug,
                'sections' => count($proposal->matches),
                'hadithapi_chapters' => $proposal->hadithapiChapters,
                'hadithapi_hadith' => $proposal->hadithapiHadith,
                'ambiguous_numbers' => $proposal->ambiguousNumbers,
                'mapping_errors' => $proposal->mappingErrors,
                'accepted' => (object) $accepted,
                'rejected' => (object) $rejected,
            ];
            $paste[$proposal->slug] = (object) $pasteBlock;
        }

        return [
            'generated_at' => CarbonImmutable::now('UTC')->toIso8601ZuluString('millisecond'),
            'source' => 'hadithapi.com',
            'commit' => (string) config('hadith.commit'),
            'threshold_percent' => (int) config('hadith.title_match.threshold_percent', 95),
            'collections' => (object) $collections,
            'skipped' => (object) $skipped,
            'paste' => (object) $paste,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function acceptedEntry(SectionMatch $match): array
    {
        return [
            'title_ar' => $match->titleAr,
            'title_ar_source' => 'hadithapi.com',
            'chapter_id' => $match->chapterId,
            'forward' => $this->stats($match->forwardMatched, $match->sectionSize, $match->forwardPercent()),
            'backward' => $this->stats($match->backwardMatched, $match->chapterSize, $match->backwardPercent()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function rejectedEntry(SectionMatch $match): array
    {
        return [
            'reason' => $match->reason,
            'chapter_id' => $match->chapterId,
            'forward' => $this->stats($match->forwardMatched, $match->sectionSize, $match->forwardPercent()),
            'backward' => $this->stats($match->backwardMatched, $match->chapterSize, $match->backwardPercent()),
        ];
    }

    /**
     * @return array{matched: int, total: int, percent: float}
     */
    private function stats(int $matched, int $total, float $percent): array
    {
        return ['matched' => $matched, 'total' => $total, 'percent' => $percent];
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Exceptions\CatalogueUnreadableException;
use App\Domains\Azkar\OpenDua\CatalogueDownloader;
use App\Domains\Azkar\Services\QuranReferenceCandidates;
use App\Domains\Azkar\Services\QuranReferenceMapWriter;
use App\Domains\Azkar\Services\QuranReferencePolicy;
use App\Domains\Azkar\Services\QuranSpanMatcher;
use App\Domains\Azkar\Sources\AzkarSourceRegistry;
use App\Domains\Azkar\Validation\CatalogueValidator;
use App\Support\QuranText\SearchTextNormalizer;
use Illuminate\Console\Command;
use InvalidArgumentException;

/**
 * Matches every ﴿…﴾ span of the pinned catalogue against Taybah's bundled Tanzil text and writes the candidate rows
 * of config/azkar_quran_map.php (ADR 0031 §4, §11). The file holds references and status only. Rows marked reviewed
 * are kept as they are.
 */
final class QuranMapCandidatesCommand extends Command
{
    use ResolvesCataloguePath;

    /**
     * Validator codes that are expected here: the map is what this command is about to rewrite.
     */
    private const array MAP_CODES = [
        'quran_reference_unreviewed',
        'invalid_quran_reference',
        'quran_reference_candidate',
    ];

    protected $signature = 'azkar:quran-map-candidates
        {path? : The pinned OpenDua catalogue file (omit with --download)}
        {--download : Download the pinned catalogue into storage/app/azkar and verify its SHA-256 first}
        {--output= : Where to write the map (default config/azkar_quran_map.php, or config/azkar_hisnmuslim_quran_map.php)}
        {--source= : opendua (default) or hisnmuslim}';

    protected $description = 'Match each Quran span of the pinned catalogue to the Tanzil text and write candidate reference rows (ADR 0031 §11).';

    public function handle(
        CatalogueDownloader $downloader,
        CatalogueValidator $validator,
        QuranReferenceCandidates $candidates,
        QuranReferenceMapWriter $writer,
        SearchTextNormalizer $normalizer,
        AzkarSourceRegistry $sources,
    ): int {
        $requested = $this->option('source');

        try {
            $source = $sources->for(is_string($requested) && $requested !== '' ? $requested : 'opendua');
        } catch (InvalidArgumentException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $profile = $source->profile();

        if ($profile->code === 'opendua') {
            $location = $this->resolveCataloguePath($downloader);
        } else {
            $argument = $this->argument('path');
            $location = is_string($argument) && $argument !== ''
                ? $argument
                : storage_path('app/azkar/'.$profile->code.'/'.(string) config('azkar.hisnmuslim.snapshot_date'));
        }

        if ($location === null) {
            return self::FAILURE;
        }

        try {
            $parsed = $source->parse($location);
        } catch (CatalogueUnreadableException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        if (! hash_equals($profile->pinnedSha256, $parsed->sha256)) {
            $this->error('The '.$profile->displayName.' catalogue does not match its pinned SHA-256. Nothing was written.');

            return self::FAILURE;
        }

        $blocking = [];

        foreach ($validator->validate($parsed->data, $profile) as $issue) {
            if ($issue->isError() && ! in_array($issue->code, self::MAP_CODES, true)) {
                $blocking[] = $issue->code;
            }
        }

        if ($blocking !== []) {
            $this->error('The catalogue has structural errors, so no map was written: '.implode(', ', array_unique($blocking)));

            return self::FAILURE;
        }

        $output = $this->option('output');
        $default = $profile->code === 'opendua' ? 'azkar_quran_map.php' : 'azkar_'.$profile->code.'_quran_map.php';
        $output = is_string($output) && $output !== '' ? $output : config_path($default);
        $existing = is_file($output) ? (array) require $output : [];

        $matcher = QuranSpanMatcher::fromTanzilFiles(QuranSpanMatcher::uthmaniPath(), QuranSpanMatcher::simplePath(), $normalizer);
        $result = $candidates->build($parsed->data, $existing, $matcher, $profile->collectionId);

        $writer->write($output, $result['rows']);

        $this->printSummary($result['stats'], $result['items'], $result['rows'], $output);

        return self::SUCCESS;
    }

    /**
     * Counts only: per item, and in total. Each unmatched or candidate span is listed by its reference, never its text.
     *
     * @param  array<string, int>  $stats
     * @param  array<string, array<string, int>>  $items
     * @param  array<string, list<array<array-key, mixed>>>  $rows
     */
    private function printSummary(array $stats, array $items, array $rows, string $output): void
    {
        $this->line(sprintf('Candidate threshold (similarity): %.2f. Exact matches use the simple text. Rows marked reviewed are never changed.', QuranSpanMatcher::THRESHOLD));
        $this->table(['Metric', 'Value'], [
            ['items with Quran spans', $stats['items']],
            ['spans', $stats['spans']],
            ['exact (simple text)', $stats['exact']],
            ['candidate (similarity at or above threshold)', $stats['candidate_similarity']],
            ['unmatched', $stats['unmatched']],
            ['spans across surah boundaries', $stats['multi_surah']],
            ['reviewed rows kept', $stats['reviewed_kept']],
            ['reviewed items kept whole (span count changed)', $stats['reviewed_conflicts']],
        ]);

        foreach ($items as $itemKey => $counts) {
            $this->line(sprintf('  %s: spans=%d exact=%d candidate=%d unmatched=%d', $itemKey, $counts['spans'], $counts['exact'], $counts['candidate'], $counts['unmatched']));
        }

        foreach ($rows as $itemKey => $spans) {
            foreach ($spans as $position => $span) {
                if (($span['status'] ?? null) !== QuranReferencePolicy::UNMATCHED) {
                    continue;
                }

                $this->line(sprintf('  unmatched %s span %d: (%s) %s', $itemKey, $position + 1, (string) ($span['evidence'] ?? ''), $this->reference($span)));
            }
        }

        $this->line('Map written to: '.$output);
    }

    /**
     * @param  array<array-key, mixed>  $span
     */
    private function reference(array $span): string
    {
        if (! is_int($span[0] ?? null) || ! is_int($span[1] ?? null)) {
            return '(no range)';
        }

        $to = is_int($span[2] ?? null) ? '-'.$span[2] : '';

        return sprintf('[%d:%d%s]', $span[0], $span[1], $to);
    }
}

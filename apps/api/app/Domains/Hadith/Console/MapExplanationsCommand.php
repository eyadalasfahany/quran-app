<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Console;

use App\Domains\Azkar\Exceptions\SnapshotException;
use App\Domains\Azkar\Sources\HadeethEncSnapshot;
use App\Domains\Hadith\Overlay\HadithDataFiles;
use App\Domains\Hadith\Services\HadithExplanationImporter;
use App\Domains\Hadith\Services\HadithExplanationLinksFile;
use App\Domains\Hadith\Services\HadithExplanationMapper;
use App\Support\Storage\SourceCache;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * ADR 0078 step 2 and 5: the mapping measurement with its negative control (counts only, never text), and with --write the
 * text-free links file. Dev-only: it reads our hadith text from the database and never runs in production.
 */
final class MapExplanationsCommand extends Command
{
    protected $signature = 'hadith:map-explanations
        {--write : Write database/data/hadith/explanations/hadeethenc.json (the thresholds in config are used)}';

    protected $description = 'Map HadeethEnc explanations to our hadith by rule, with a negative control; counts only (ADR 0078).';

    private const string CONFIG_PREFIX = 'hadith_explanations.hadeethenc';

    private const string STORAGE_RELATIVE = 'hadith_explanations/hadeethenc';

    public function handle(HadeethEncSnapshot $snapshot, HadithExplanationMapper $mapper, HadithExplanationLinksFile $linksFile): int
    {
        if (app()->isProduction()) {
            $this->error('hadith:map-explanations is a developer command and does not run in production.');

            return self::FAILURE;
        }

        $date = (string) config(self::CONFIG_PREFIX.'.snapshot_date', '');
        $pin = (string) config(self::CONFIG_PREFIX.'.snapshot_sha256', '');
        $directory = SourceCache::path(self::STORAGE_RELATIVE.'/'.$date);

        if ($date === '' || $pin === '' || ! is_dir($directory)) {
            $this->error('No pinned HadeethEnc explanations snapshot. Run hadith:explanations-snapshot first.');

            return self::FAILURE;
        }

        try {
            $records = $snapshot->load($directory, self::CONFIG_PREFIX);
        } catch (SnapshotException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $list = [];

        foreach ($records as $id => $record) {
            $list[] = [
                'id' => $id,
                'attribution' => is_string($record['attribution'] ?? null) ? $record['attribution'] : '',
                'text' => is_string($record['hadeeth'] ?? null) ? $record['hadeeth'] : '',
            ];
        }

        /** @var list<string> $collections */
        $collections = config('hadith.collections', []);
        $measure = $mapper->measure($list, $collections);
        $minimum = (int) round((float) config('hadith_explanations.mapping.min_containment') * 100);
        $gap = (int) round((float) config('hadith_explanations.mapping.min_gap') * 100);

        $this->printCounts($measure, $minimum, $gap);
        $this->printGrid($measure);

        $links = HadithExplanationMapper::links($measure['pairs'], $minimum, $gap);
        $this->line('Accepted links at the configured thresholds: '.count($links));

        if (! $this->option('write')) {
            $this->line('Dry run: no file written. Use --write to write the links file.');

            return self::SUCCESS;
        }

        $bytes = $linksFile->encode($pin, ['min_containment_percent' => $minimum, 'min_gap_percent' => $gap], $links);
        $path = app(HadithDataFiles::class)->pathOf(HadithExplanationImporter::LINKS_PATH);
        File::ensureDirectoryExists(dirname($path));
        File::put($path, $bytes);

        $this->info('Links file written: '.$path);
        $this->line("  'explanations/hadeethenc.json' => '".hash('sha256', $bytes)."',");

        return self::SUCCESS;
    }

    /**
     * @param  array{records: int, named: int, unnamed: int, pairs: list<array{kind: string, collection: string, id: int, size: int, best: int, second: int, number: ?string}>}  $measure
     */
    private function printCounts(array $measure, int $minimum, int $gap): void
    {
        $this->line(sprintf('Records: %d; named by an attribution: %d; named by none: %d; thresholds %d%% containment, %d%% gap.', $measure['records'], $measure['named'], $measure['unnamed'], $minimum, $gap));

        $rows = [];

        foreach ((array) config('hadith.collections', []) as $slug) {
            $real = array_values(array_filter($measure['pairs'], static fn (array $pair): bool => $pair['kind'] === 'real' && $pair['collection'] === $slug));
            $counts = ['accepted' => 0, 'ambiguous' => 0, 'below' => 0];

            foreach ($real as $pair) {
                $counts[HadithExplanationMapper::classify($pair['size'], $pair['best'], $pair['second'], $minimum, $gap)]++;
            }

            if ($real !== []) {
                $rows[] = [$slug, count($real), $counts['accepted'], $counts['ambiguous'], $counts['below']];
            }
        }

        $this->table(['Collection', 'Named records', 'Accepted', 'Ambiguous', 'Unmatched (below)'], $rows);
    }

    /**
     * Thresholds around the chosen one, against the negative control (records compared with a collection they are not named in).
     *
     * @param  array{pairs: list<array{kind: string, collection: string, id: int, size: int, best: int, second: int, number: ?string}>}  $measure
     */
    private function printGrid(array $measure): void
    {
        $controls = array_values(array_filter($measure['pairs'], static fn (array $pair): bool => $pair['kind'] === 'control'));
        $reals = array_values(array_filter($measure['pairs'], static fn (array $pair): bool => $pair['kind'] === 'real'));
        $rows = [];

        foreach ([50, 60, 70, 80, 90] as $minimum) {
            foreach ([0, 5, 10, 15, 20] as $gap) {
                $accepted = count(array_filter($reals, static fn (array $pair): bool => HadithExplanationMapper::classify($pair['size'], $pair['best'], $pair['second'], $minimum, $gap) === 'accepted'));
                $falseAccepts = count(array_filter($controls, static fn (array $pair): bool => HadithExplanationMapper::classify($pair['size'], $pair['best'], $pair['second'], $minimum, $gap) === 'accepted'));
                $rows[] = [$minimum.'%', $gap.'%', $accepted, $controls === [] ? 'n/a' : sprintf('%d (%.1f%%)', $falseAccepts, 100 * $falseAccepts / count($controls))];
            }
        }

        $this->line('Negative control: '.count($controls).' record-collection pairs compared with a collection the record is not named in (an upper bound on false accepts).');
        $this->table(['Containment', 'Gap', 'Real accepted', 'Control accepted (false accepts)'], $rows);
    }
}

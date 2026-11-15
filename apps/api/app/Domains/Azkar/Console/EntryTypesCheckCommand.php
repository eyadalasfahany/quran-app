<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Enums\AzkarEntryClass;
use App\Domains\Azkar\Exceptions\CatalogueUnreadableException;
use App\Domains\Azkar\Services\EntryTypePolicy;
use App\Domains\Azkar\Sources\AzkarSourceRegistry;
use App\Support\Storage\SourceCache;
use Illuminate\Console\Command;

/**
 * Checks config azkar_entry_types.php (plan docs/plans/azkar-duas-split.md): every key must exist in the pinned OpenDua
 * catalogue, must not be an excluded entry, and every row must be well-formed. Reads the catalogue the importer reads
 * and never downloads it. Only reviewed rows take effect; candidate rows are listed as warnings.
 */
final class EntryTypesCheckCommand extends Command
{
    protected $signature = 'azkar:entry-types-check
        {path? : The pinned OpenDua catalogue file (default: the verified copy in the source cache, see azkar:import --download)}';

    protected $description = 'Check the dhikr or dua classification of Azkar entries against the pinned catalogue (plan azkar-duas-split).';

    public function handle(EntryTypePolicy $policy, AzkarSourceRegistry $sources): int
    {
        $source = $sources->for((string) config('azkar.opendua.source_code'));
        $profile = $source->profile();

        $argument = $this->argument('path');
        $path = is_string($argument) && $argument !== ''
            ? $argument
            : SourceCache::path('azkar/catalogue-'.$profile->version.'.json');

        try {
            $parsed = $source->parse($path);
        } catch (CatalogueUnreadableException $exception) {
            $this->error('The catalogue cannot be read: '.$exception->getMessage().' ('.$path.')');

            return self::FAILURE;
        }

        $problems = [];

        if (! hash_equals($profile->pinnedSha256, $parsed->sha256)) {
            $problems[] = 'The catalogue does not match the pinned SHA-256: '.$path;
        }

        $known = $this->knownEntryKeys($parsed->data, $profile->collectionId);
        $entries = config('azkar_entry_types.entries', []);

        if (! is_array($entries)) {
            $this->error('config azkar_entry_types.entries must be an array.');

            return self::FAILURE;
        }

        $plan = $policy->resolve($entries);
        $excluded = config('azkar.excluded_entries', []);
        $excluded = is_array($excluded) ? $excluded : [];

        foreach ($plan->errors as $entryKey => $reason) {
            $problems[] = sprintf('%s: invalid row (%s)', $entryKey, $reason);
        }

        foreach (array_keys($entries) as $entryKey) {
            if (! is_string($entryKey) || isset($plan->errors[$entryKey])) {
                continue;
            }

            if (! isset($known[$entryKey])) {
                $problems[] = $entryKey.': not an entry of the pinned catalogue';
            }

            if (array_key_exists($entryKey, $excluded)) {
                $problems[] = $entryKey.': excluded in config azkar.excluded_entries ('.(string) $excluded[$entryKey].')';
            }
        }

        $this->printCounts($plan->counts);
        $this->info('Reviewed rows applied: '.count($plan->types));

        if ($plan->candidates !== []) {
            $this->warn(sprintf('%d candidate row(s) are not applied; only reviewed rows take effect.', count($plan->candidates)));

            if ($this->output->isVerbose()) {
                foreach ($plan->candidates as $entryKey) {
                    $this->line('  candidate: '.$entryKey);
                }
            }
        }

        foreach ($problems as $problem) {
            $this->error($problem);
        }

        if ($problems !== []) {
            $this->error(sprintf('azkar:entry-types-check failed with %d problem(s).', count($problems)));

            return self::FAILURE;
        }

        $this->info('azkar:entry-types-check passed.');

        return self::SUCCESS;
    }

    /**
     * @param  array<string, array<string, int>>  $counts  type => status => number of rows
     */
    private function printCounts(array $counts): void
    {
        $rows = [];

        foreach (AzkarEntryClass::cases() as $class) {
            $reviewed = $counts[$class->value][EntryTypePolicy::REVIEWED] ?? 0;
            $candidate = $counts[$class->value][EntryTypePolicy::CANDIDATE] ?? 0;
            $rows[] = [$class->value, $reviewed, $candidate, $reviewed + $candidate];
        }

        $this->table(['Type', 'Reviewed', 'Candidate', 'Total'], $rows);
    }

    /**
     * The azkar entry keys the pinned catalogue holds: collection id, then the OpenDua entry id (as the importer keys them).
     *
     * @param  array<string, mixed>  $catalogue
     * @return array<string, true>
     */
    private function knownEntryKeys(array $catalogue, string $collectionId): array
    {
        $known = [];
        $entries = is_array($catalogue['entries'] ?? null) ? $catalogue['entries'] : [];

        foreach ($entries as $entry) {
            if (is_array($entry) && is_string($entry['id'] ?? null)) {
                $known[$collectionId.':'.$entry['id']] = true;
            }
        }

        return $known;
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Content\Console;

use Illuminate\Console\Command;

/**
 * One command for all Quran Foundation content, local and production (ADR 0041, ADR 0095). The steps run in this order:
 *
 *  1. qf:ping, to check the QF credentials and reachability before any write.
 *  2. content:sync for each group in quran.sync.groups, in config order (only the --group values when given).
 *  3. content:ensure-packs.
 *
 * An unknown --group value fails before any step runs. Every step stops the setup when it fails.
 */
final class SetupQuranCommand extends Command
{
    protected $signature = 'quran:setup
        {--group=* : Only these sync groups (default every group in quran.sync.groups)}';

    protected $description = 'Ping Quran Foundation, sync every configured resource group, then ensure content packs (local/production setup).';

    public function handle(): int
    {
        $groups = $this->groupsToSync();

        if ($groups === null) {
            return self::FAILURE;
        }

        if ($this->runStep('qf:ping') !== self::SUCCESS) {
            return self::FAILURE;
        }

        foreach ($groups as $group) {
            if ($this->runStep('content:sync', ['group' => $group]) !== self::SUCCESS) {
                return self::FAILURE;
            }
        }

        if ($this->runStep('content:ensure-packs') !== self::SUCCESS) {
            return self::FAILURE;
        }

        $this->info('Quran setup finished: '.count($groups).' groups synced, content packs ensured.');

        return self::SUCCESS;
    }

    /**
     * Returns the groups to sync in config order, or null when a --group value is unknown (the error is printed).
     *
     * @return list<string>|null
     */
    private function groupsToSync(): ?array
    {
        $configured = config('quran.sync.groups');
        $known = is_array($configured) ? array_map(strval(...), array_keys($configured)) : [];
        $requested = $this->requestedGroups();

        $unknown = false;

        foreach (array_diff($requested, $known) as $group) {
            $this->error('Unknown group: '.$group);
            $unknown = true;
        }

        if ($unknown) {
            return null;
        }

        if ($requested === []) {
            return $known;
        }

        return array_values(array_intersect($known, $requested));
    }

    /**
     * @return list<string>
     */
    private function requestedGroups(): array
    {
        $values = $this->option('group');

        return array_values(array_filter($values, static fn (mixed $value): bool => is_string($value) && $value !== ''));
    }

    /**
     * @param  array<string, mixed>  $arguments
     */
    private function runStep(string $command, array $arguments = []): int
    {
        $exitCode = $this->call($command, $arguments);

        if ($exitCode !== self::SUCCESS) {
            $this->error('quran:setup failed at '.$command.'.');
        }

        return $exitCode;
    }
}

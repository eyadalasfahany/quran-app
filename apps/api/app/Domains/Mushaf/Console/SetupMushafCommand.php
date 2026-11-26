<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Console;

use Illuminate\Console\Command;

/**
 * One command for all Madinah SVG mushaf editions, local and production (ADR 0090, ADR 0095). The first import downloads
 * about 1.6 GB, so the memory limit is lifted. The steps run in this order, for the editions selected (config order):
 *
 *  1. mushaf:import for each edition.
 *  2. mushaf:build-word-boxes for hafs, only when hafs is selected.
 *  3. mushaf:publish for each edition. Word boxes are never skipped (no --without-word-boxes).
 *  4. content:ensure-packs.
 *
 * An unknown --key value fails before any step runs. Every step stops the setup when it fails.
 */
final class SetupMushafCommand extends Command
{
    protected $signature = 'mushaf:setup
        {--key=* : Only these editions (default every key in mushaf.editions)}';

    protected $description = 'Import, build word boxes for hafs, and publish every configured SVG mushaf edition, then ensure content packs (local/production setup).';

    public function handle(): int
    {
        ini_set('memory_limit', '-1');

        $keys = $this->keysToSetUp();

        if ($keys === null) {
            return self::FAILURE;
        }

        foreach ($keys as $key) {
            if ($this->runStep('mushaf:import', ['key' => $key]) !== self::SUCCESS) {
                return self::FAILURE;
            }
        }

        if (in_array('hafs', $keys, true)) {
            if ($this->runStep('mushaf:build-word-boxes', ['key' => 'hafs']) !== self::SUCCESS) {
                return self::FAILURE;
            }
        }

        foreach ($keys as $key) {
            if ($this->runStep('mushaf:publish', ['key' => $key]) !== self::SUCCESS) {
                return self::FAILURE;
            }
        }

        if ($this->runStep('content:ensure-packs') !== self::SUCCESS) {
            return self::FAILURE;
        }

        $this->info('Mushaf setup finished: '.count($keys).' editions imported, published and ensured.');

        return self::SUCCESS;
    }

    /**
     * Returns the editions to set up in config order, or null when a --key value is unknown (the error is printed).
     *
     * @return list<string>|null
     */
    private function keysToSetUp(): ?array
    {
        $configured = config('mushaf.editions');
        $known = is_array($configured) ? array_map(strval(...), array_keys($configured)) : [];
        $requested = $this->requestedKeys();

        $unknown = false;

        foreach (array_diff($requested, $known) as $key) {
            $this->error('Unknown edition: '.$key);
            $unknown = true;
        }

        if ($unknown) {
            return null;
        }

        $selected = $requested === [] ? $known : array_values(array_intersect($known, $requested));
        $visible = [];

        foreach ($selected as $key) {
            if (($configured[$key]['publish'] ?? true) === false) {
                $this->line('Skipped hidden edition: '.$key.' (ADR 0090 item 12).');

                continue;
            }

            $visible[] = $key;
        }

        return $visible;
    }

    /**
     * @return list<string>
     */
    private function requestedKeys(): array
    {
        $values = $this->option('key');

        return array_values(array_filter($values, static fn (mixed $value): bool => is_string($value) && $value !== ''));
    }

    /**
     * @param  array<string, mixed>  $arguments
     */
    private function runStep(string $command, array $arguments = []): int
    {
        $exitCode = $this->call($command, $arguments);

        if ($exitCode !== self::SUCCESS) {
            $this->error('mushaf:setup failed at '.$command.'.');
        }

        return $exitCode;
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Duas\Console;

use Illuminate\Console\Command;

/**
 * Runs the Duas HadeethEnc snapshot, catalogue import (deferred or immediate pack), and content pack ensure chain for
 * local and production setup (ADR 0044-duas).
 */
final class SetupDuasCommand extends Command
{
    protected $signature = 'duas:setup
        {--build-packs : Build the duas pack during import instead of deferring to the web service start}';

    protected $description = 'Pin the HadeethEnc snapshot, import the Duas catalogue, then ensure content packs (local/production setup).';

    public function handle(): int
    {
        if ($this->runStep('duas:snapshot', [
            'source' => 'hadeethenc',
            '--pinned' => true,
        ]) !== self::SUCCESS) {
            return self::FAILURE;
        }

        if ($this->runStep('duas:import', $this->importArguments()) !== self::SUCCESS) {
            return self::FAILURE;
        }

        if ($this->runStep('content:ensure-packs') !== self::SUCCESS) {
            return self::FAILURE;
        }

        $this->info('Duas setup finished: HadeethEnc snapshot pinned, catalogue imported, content packs ensured.');

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $arguments
     */
    private function runStep(string $command, array $arguments = []): int
    {
        $exitCode = $this->call($command, $arguments);

        if ($exitCode !== self::SUCCESS) {
            $this->error('duas:setup failed at '.$command.'.');
        }

        return $exitCode;
    }

    /**
     * @return array<string, bool>
     */
    private function importArguments(): array
    {
        $arguments = ['--download' => true];

        if ((bool) $this->option('build-packs')) {
            $arguments['--build-packs'] = true;

            return $arguments;
        }

        $arguments['--defer-pack'] = true;

        return $arguments;
    }
}

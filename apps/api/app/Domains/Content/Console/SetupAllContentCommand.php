<?php

declare(strict_types=1);

namespace App\Domains\Content\Console;

use Illuminate\Console\Command;

/**
 * One command for all content features, local and production (ADR 0095). It runs each feature's setup command in this
 * order: quran (quran:setup), recitations (recitations:setup), azkar (azkar:setup), duas (duas:setup), hadith
 * (hadith:setup) and mushaf (mushaf:setup). Features are independent, so a failing feature is recorded and the run
 * goes on with the next one. The summary lists each feature as ok, failed or skipped, and the command fails if any
 * feature failed. Unknown --skip values fail before anything runs.
 */
final class SetupAllContentCommand extends Command
{
    /**
     * Feature name => its setup command, in run order.
     *
     * @var array<string, string>
     */
    private const FEATURE_COMMANDS = [
        'quran' => 'quran:setup',
        'recitations' => 'recitations:setup',
        'azkar' => 'azkar:setup',
        'duas' => 'duas:setup',
        'hadith' => 'hadith:setup',
        'mushaf' => 'mushaf:setup',
    ];

    protected $signature = 'content:setup
        {--skip=* : Features to skip: quran, recitations, azkar, duas, hadith, mushaf}
        {--skip-explanations : Passed to hadith:setup}';

    protected $description = 'Run every content feature setup in order (quran, recitations, azkar, duas, hadith, mushaf), continuing past a failed feature, then print a summary (local/production setup).';

    public function handle(): int
    {
        ini_set('memory_limit', '-1');

        $skipped = $this->requestedSkips();

        if ($skipped === null) {
            return self::FAILURE;
        }

        /** @var array<string, string> $results */
        $results = [];

        foreach (array_keys(self::FEATURE_COMMANDS) as $feature) {
            if (in_array($feature, $skipped, true)) {
                $results[$feature] = 'skipped';

                continue;
            }

            $exitCode = $this->call(self::FEATURE_COMMANDS[$feature], $this->argumentsFor($feature));

            if ($exitCode !== self::SUCCESS) {
                $this->error('content:setup: '.$feature.' failed; continuing.');
                $results[$feature] = 'failed';

                continue;
            }

            $results[$feature] = 'ok';
        }

        $this->newLine();

        foreach ($results as $feature => $status) {
            $this->line($feature.': '.$status);
        }

        return in_array('failed', $results, true) ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Returns the features to skip, or null when a --skip value is unknown (the error is printed).
     *
     * @return list<string>|null
     */
    private function requestedSkips(): ?array
    {
        $values = $this->option('skip');
        $requested = array_values(array_filter($values, static fn (mixed $value): bool => is_string($value) && $value !== ''));

        $unknown = false;

        foreach ($requested as $feature) {
            if (! array_key_exists($feature, self::FEATURE_COMMANDS)) {
                $this->error('Unknown feature: '.$feature);
                $unknown = true;
            }
        }

        return $unknown ? null : $requested;
    }

    /**
     * @return array<string, bool>
     */
    private function argumentsFor(string $feature): array
    {
        if ($feature === 'hadith' && (bool) $this->option('skip-explanations')) {
            return ['--skip-explanations' => true];
        }

        return [];
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Console;

use App\Domains\Seerah\Format\SeerahJson;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use JsonException;

/**
 * Dev only (ADR 0089, Phase 8 step 4): writes every JSON file of the Seerah data folder in the canonical format, or with --check
 * lists the files that differ and fails (CI). It never changes a value, only the layout.
 */
final class FormatCommand extends Command
{
    protected $signature = 'seerah:fmt
        {--check : List the files that are not canonical and fail; write nothing}
        {--data= : The data folder (default database/data/seerah)}';

    protected $description = 'Format the Seerah data files canonically, or check them with --check (ADR 0089, Phase 8 step 4).';

    public function handle(): int
    {
        $directory = (string) ($this->option('data') ?: database_path('data/seerah'));

        if (! is_dir($directory)) {
            $this->error('The data folder is missing: '.$directory);

            return self::FAILURE;
        }

        $dirty = [];

        foreach ($this->jsonFiles($directory) as $path) {
            $text = (string) File::get($path);
            $relative = ltrim(substr($path, strlen($directory)), '/');

            try {
                $canonical = SeerahJson::canonicalText($text);
            } catch (JsonException) {
                $this->error('Not valid JSON: '.$relative);

                return self::FAILURE;
            }

            if ($canonical === $text) {
                continue;
            }

            $dirty[] = $relative;

            if (! $this->option('check')) {
                File::put($path, $canonical);
            }
        }

        if ($this->option('check')) {
            foreach ($dirty as $relative) {
                $this->line('not canonical: '.$relative);
            }

            if ($dirty !== []) {
                $this->error('Run php artisan seerah:fmt to format '.count($dirty).' file(s).');

                return self::FAILURE;
            }

            $this->info('All Seerah data files are canonical.');

            return self::SUCCESS;
        }

        $this->info('Formatted '.count($dirty).' file(s).');

        return self::SUCCESS;
    }

    /**
     * @return list<string>
     */
    private function jsonFiles(string $directory): array
    {
        $paths = [];

        foreach (File::allFiles($directory) as $file) {
            if ($file->getExtension() === 'json') {
                $paths[] = $file->getPathname();
            }
        }

        sort($paths, SORT_STRING);

        return $paths;
    }
}

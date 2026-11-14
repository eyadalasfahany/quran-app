<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Console;

use App\Domains\Seerah\Authoring\SkeletonWriter;
use App\Domains\Seerah\Dataset\BookIndex;
use App\Domains\Seerah\Exceptions\SeerahCanonicalException;
use App\Domains\Seerah\Services\CanonicalBookBuilder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use JsonException;

/**
 * Dev only (ADR 0089, Phase 8 step 5): writes the event skeleton of one batch into events/<batch>.json. It refuses a file that already
 * holds events, so no curated work is overwritten. No title, place or year is typed: the title is the heading, the place and year are null.
 */
final class SkeletonCommand extends Command
{
    protected $signature = 'seerah:skeleton
        {batch : The batch name, E1 to E4}
        {--data= : The data folder (default database/data/seerah)}
        {--source= : Another source file (tests and dev only)}';

    protected $description = 'Write the draft event skeleton of one review batch (ADR 0089, Phase 8 step 5).';

    public function handle(CanonicalBookBuilder $builder, SkeletonWriter $writer): int
    {
        $batch = (string) $this->argument('batch');
        $batches = (array) config('seerah.batches', []);
        $range = $batches[$batch] ?? null;

        if (! is_array($range)) {
            $this->error('The batch '.$batch.' is not in config seerah.batches.');

            return self::FAILURE;
        }

        $source = $this->option('source');

        try {
            $build = $builder->build(is_string($source) && $source !== '' ? $source : null);
        } catch (SeerahCanonicalException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $index = new BookIndex($build->book, $this->yearHeadings());
        $from = $index->sectionPosition((string) $range['from']);
        $to = $index->sectionPosition((string) $range['to']);

        if ($from === null || $to === null) {
            $this->error('The batch '.$batch.' names sections that are not in the book.');

            return self::FAILURE;
        }

        $directory = (string) ($this->option('data') ?: database_path('data/seerah'));
        $path = $directory.'/events/'.$batch.'.json';

        if (is_file($path) && $this->holdsEvents($path)) {
            $this->error($path.' already holds events; the skeleton is not written over curated work.');

            return self::FAILURE;
        }

        $skeleton = $writer->build($batch, (string) ($range['period'] ?? ''), $from, $to, $index, $build->book);
        File::ensureDirectoryExists(dirname($path));
        File::put($path, $skeleton['json']);

        $this->info('Wrote '.$skeleton['count'].' draft event(s) to '.$path.'.');

        return self::SUCCESS;
    }

    /**
     * @return array<string, int>
     */
    private function yearHeadings(): array
    {
        $years = [];

        foreach ((array) config('seerah.year_headings', []) as $title => $year) {
            $years[(string) $title] = (int) $year;
        }

        return $years;
    }

    private function holdsEvents(string $path): bool
    {
        try {
            $data = json_decode((string) File::get($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return true;
        }

        return is_array($data) && ($data['events'] ?? []) !== [];
    }
}

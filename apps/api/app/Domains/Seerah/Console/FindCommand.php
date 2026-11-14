<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Console;

use App\Domains\Seerah\Authoring\SearchText;
use App\Domains\Seerah\Exceptions\SeerahCanonicalException;
use App\Domains\Seerah\Services\CanonicalBookBuilder;
use Illuminate\Console\Command;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Dev only (ADR 0089, Phase 8 step 5): finds a term in the canonical text with the search normalisation. Prints the paragraph id, its
 * section and page, the byte offsets, and the match in its context. Stored text is never changed.
 */
final class FindCommand extends Command
{
    private const int CONTEXT_BYTES = 60;

    protected $signature = 'seerah:find
        {term : The word or phrase to find}
        {--section= : Only this section id (for example s042)}
        {--limit=50 : Most matches to print}
        {--source= : Another source file (tests and dev only)}';

    protected $description = 'Find a term in the canonical Seerah text (ADR 0089, Phase 8 step 5).';

    public function handle(CanonicalBookBuilder $builder): int
    {
        $term = (string) $this->argument('term');
        $section = $this->option('section');
        $section = is_string($section) && $section !== '' ? $section : null;
        $limit = max(1, (int) $this->option('limit'));
        $source = $this->option('source');

        try {
            $book = $builder->build(is_string($source) && $source !== '' ? $source : null)->book;
        } catch (SeerahCanonicalException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $printed = 0;
        $total = 0;

        foreach ($book->paragraphs as $paragraph) {
            if ($section !== null && $paragraph->sectionId !== $section) {
                continue;
            }

            foreach (SearchText::occurrences($paragraph->text, $term) as [$start, $end]) {
                $total++;

                if ($printed >= $limit) {
                    continue;
                }

                $printed++;
                $from = max(0, $start - self::CONTEXT_BYTES);
                $before = mb_strcut($paragraph->text, $from, $start - $from);
                $inside = substr($paragraph->text, $start, $end - $start);
                $after = mb_strcut($paragraph->text, $end, min(self::CONTEXT_BYTES, strlen($paragraph->text) - $end));

                $this->output->write(sprintf(
                    "%s %s page %d bytes %d-%d: %s[%s]%s\n",
                    $paragraph->id,
                    $paragraph->sectionId,
                    $paragraph->page,
                    $start,
                    $end,
                    $before,
                    $inside,
                    $after,
                ), false, OutputInterface::OUTPUT_RAW);
            }
        }

        $this->line($total.' match(es); printed '.$printed.'.');

        return self::SUCCESS;
    }
}

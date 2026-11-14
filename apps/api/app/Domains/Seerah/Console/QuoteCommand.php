<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Console;

use App\Domains\Seerah\Authoring\QuoteExtractor;
use App\Domains\Seerah\Exceptions\SeerahAuthoringException;
use App\Domains\Seerah\Exceptions\SeerahCanonicalException;
use App\Domains\Seerah\Format\SeerahJson;
use App\Domains\Seerah\Services\CanonicalBookBuilder;
use Illuminate\Console\Command;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Dev only (ADR 0089, Phase 8 step 5): prints the exact substring of one paragraph from one word to another, and the evidence JSON
 * snippet it goes into. The text is written raw, so it is byte-identical to the canonical paragraph.
 */
final class QuoteCommand extends Command
{
    protected $signature = 'seerah:quote
        {para : The paragraph id (for example p00123)}
        {from : The first word of the quote}
        {to : The last word of the quote, inside the same paragraph}
        {--occurrence=1 : Which occurrence of the first word to start from}
        {--source= : Another source file (tests and dev only)}';

    protected $description = 'Print the exact canonical quote from a paragraph between two words (ADR 0089, Phase 8 step 5).';

    public function handle(CanonicalBookBuilder $builder, QuoteExtractor $extractor): int
    {
        $source = $this->option('source');

        try {
            $book = $builder->build(is_string($source) && $source !== '' ? $source : null)->book;
        } catch (SeerahCanonicalException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $paragraphId = (string) $this->argument('para');
        $paragraph = null;

        foreach ($book->paragraphs as $candidate) {
            if ($candidate->id === $paragraphId) {
                $paragraph = $candidate;

                break;
            }
        }

        if ($paragraph === null) {
            $this->error('No paragraph has the id '.$paragraphId.'.');

            return self::FAILURE;
        }

        try {
            $quote = $extractor->extract(
                $paragraph->text,
                (string) $this->argument('from'),
                (string) $this->argument('to'),
                max(1, (int) $this->option('occurrence')),
            );
        } catch (SeerahAuthoringException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $snippet = SeerahJson::render(['para' => $paragraph->id, 'quote' => $quote['text']]);

        $this->output->write($quote['text']."\n", false, OutputInterface::OUTPUT_RAW);
        $this->output->write($snippet, false, OutputInterface::OUTPUT_RAW);

        return self::SUCCESS;
    }
}

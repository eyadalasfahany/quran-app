<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Console;

use App\Domains\Seerah\Authoring\PlaceCandidates;
use App\Domains\Seerah\Exceptions\SeerahCanonicalException;
use App\Domains\Seerah\Services\CanonicalBookBuilder;
use Illuminate\Console\Command;

/**
 * Dev only (ADR 0089, Phase 8 step 5): a worklist of place-like words in the book: the seed names and the words after the cue words,
 * with counts and paragraph ids. It is never a gazetteer; the curator accepts or rejects each name.
 */
final class PlaceCandidatesCommand extends Command
{
    protected $signature = 'seerah:place-candidates
        {--limit=60 : Most candidates to print}
        {--source= : Another source file (tests and dev only)}';

    protected $description = 'List place-like names in the Seerah text as a worklist (ADR 0089, Phase 8 step 5).';

    public function handle(CanonicalBookBuilder $builder, PlaceCandidates $candidates): int
    {
        $source = $this->option('source');

        try {
            $book = $builder->build(is_string($source) && $source !== '' ? $source : null)->book;
        } catch (SeerahCanonicalException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $rows = $candidates->find($book, max(1, (int) $this->option('limit')));

        $this->table(
            ['source', 'name', 'count', 'paragraphs (first 5)'],
            array_map(
                static fn (array $row): array => [$row['source'], $row['name'], $row['count'], implode(' ', $row['paragraphs'])],
                $rows,
            ),
        );

        return self::SUCCESS;
    }
}

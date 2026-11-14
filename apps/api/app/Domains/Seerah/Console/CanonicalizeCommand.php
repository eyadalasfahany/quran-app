<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Console;

use App\Domains\Seerah\Canonical\CanonicalBook;
use App\Domains\Seerah\Canonical\StructureFileWriter;
use App\Domains\Seerah\Exceptions\SeerahCanonicalException;
use App\Domains\Seerah\Services\CanonicalBookBuilder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Dev only (ADR 0089, Phase 8 step 3): canonicalizes the pinned book and writes database/data/seerah/book/structure.json. The
 * canonical text itself is not written anywhere. Refused in production. --source and --output are for tests and dev runs over
 * another file; such a run checks no pin and must name its output, so the committed structure is never overwritten by accident.
 */
final class CanonicalizeCommand extends Command
{
    protected $signature = 'seerah:canonicalize
        {--source= : Another source file (tests and dev only); the pins are not checked, --output is then required}
        {--output= : Where to write structure.json (default database/data/seerah/book/structure.json)}';

    protected $description = 'Canonicalize the pinned Seerah source and write its section structure (ADR 0089, Phase 8 step 3).';

    public function handle(CanonicalBookBuilder $builder, StructureFileWriter $writer): int
    {
        if (app()->isProduction()) {
            $this->error('seerah:canonicalize is a developer tool and is disabled in production.');

            return self::FAILURE;
        }

        $source = $this->option('source');
        $source = is_string($source) && $source !== '' ? $source : null;
        $output = $this->option('output');
        $output = is_string($output) && $output !== '' ? $output : null;

        if ($source !== null && $output === null) {
            $this->error('--source needs --output: a run over another file must not overwrite the committed structure.');

            return self::FAILURE;
        }

        try {
            $build = $builder->build($source);
        } catch (SeerahCanonicalException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $target = $output ?? database_path('data/seerah/book/structure.json');
        File::ensureDirectoryExists(dirname($target));
        File::put($target, $writer->render($build));

        $book = $build->book;
        $this->line('sections: '.count($book->sections).' ('.$this->levelSummary($book).')');
        $this->line('paragraphs: '.count($book->paragraphs));
        $this->line('pages: '.($book->counts->firstPage ?? '-').' to '.($book->counts->lastPage ?? '-').' ('.$book->counts->pageMarkers.' markers)');
        $this->line('braced runs: '.$book->counts->bracedRuns.' (unbalanced: '.$book->counts->bracedUnbalanced.')');
        $this->line('printed-line markers kept: '.$book->counts->printedLineMarkers);
        $this->line('pipes kept: '.$book->counts->pipes);
        $this->line('source SHA-256: '.$build->sourceSha256);
        $this->line('canonical SHA-256: '.$build->canonicalSha256);
        $this->line('pins checked: '.($build->pinsChecked ? 'yes' : 'no (--source)'));
        $this->line('written: '.$target);

        if ($build->pinsChecked && $build->canonicalPinMissing) {
            $this->warn('config/seerah.php canonical_sha256 is null: pin the canonical SHA-256 above after reading the report.');
        }

        return self::SUCCESS;
    }

    private function levelSummary(CanonicalBook $book): string
    {
        $counts = [];

        foreach ($book->sections as $section) {
            $counts[$section->level->value] = ($counts[$section->level->value] ?? 0) + 1;
        }

        return implode(', ', array_map(
            static fn (string $level, int $count): string => $level.' '.$count,
            array_keys($counts),
            array_values($counts),
        ));
    }
}

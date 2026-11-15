<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Console;

use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Exceptions\SvgMushafException;
use App\Domains\Mushaf\Services\WordBoxBuilder;
use App\Domains\Mushaf\Services\WordBoxReviewSheet;
use Illuminate\Console\Command;

final class BuildWordBoxesCommand extends Command
{
    protected $signature = 'mushaf:build-word-boxes
        {key=hafs : only hafs is followed word by word}
        {--sheet= : directory to write the review sheet}
        {--sample= : random unflagged pages in the sheet (default: mushaf.word_boxes.review_sample)}';

    protected $description = 'Build the Hafs word boxes from the page artwork and quran-text, and run the word-box gate (ADR 0090).';

    public function handle(WordBoxBuilder $builder, WordBoxReviewSheet $sheet): int
    {
        try {
            $build = $builder->build((string) $this->argument('key'));
        } catch (SvgMushafException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        foreach ($build->issues as $issue) {
            $this->line($issue);
        }

        $this->newLine();
        $this->line(sprintf('Built %d word boxes for [%s] over %d pages (line height %.2f).', $build->words, $build->key, $build->pages, $build->lineHeight));

        foreach ($build->counts as $check => $count) {
            $this->line(sprintf('  %-10s %d', $check, $count));
        }

        foreach ($build->distributions as $name => $percentiles) {
            $this->line(sprintf('  %s percentiles: %s', $name, implode(', ', array_map(
                fn (string $percent, float $value): string => $percent.' '.$value,
                array_keys($percentiles),
                $percentiles,
            ))));
        }

        foreach ($build->needsDeveloper as $lineKey => $note) {
            $this->line(sprintf('Needs developer: %s: %s', $lineKey, $note));
        }

        $this->line('Digest: '.$build->digest);
        $this->line('Status: '.$build->status->value);
        $this->line(sprintf('Output: %s (%d bytes)', $build->output, $build->outputBytes));

        $directory = $this->option('sheet');

        if (is_string($directory) && $directory !== '') {
            $sample = $this->option('sample');
            $listed = $sheet->write($build, $directory, is_numeric($sample) ? (int) $sample : (int) config('mushaf.word_boxes.review_sample'));
            $this->line(sprintf('Review sheet: %d flagged and %d sampled pages in %s/index.html', $listed['flagged'], $listed['sampled'], rtrim($directory, '/')));
        }

        return $build->status === WordBoxesStatus::Failed ? self::FAILURE : self::SUCCESS;
    }
}

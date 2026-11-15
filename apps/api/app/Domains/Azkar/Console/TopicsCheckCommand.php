<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Console;

use App\Domains\Azkar\Services\TopicPolicy;
use Illuminate\Console\Command;

/**
 * Checks config azkar_topics.php (ADR 0092 decisions 1-2): every chapter of config azkar.chapter_titles_ar has exactly one
 * row, every row is well-formed and names a known topic or a split tag of config azkar.split_topics. Reads config only and
 * never the catalogue. Only reviewed rows take effect; candidate rows are listed as warnings.
 */
final class TopicsCheckCommand extends Command
{
    protected $signature = 'azkar:topics-check';

    protected $description = 'Check the one-topic-per-chapter config (ADR 0092): every chapter once, known topics and split tags.';

    public function handle(TopicPolicy $policy): int
    {
        $topics = config('azkar_topics.topics', []);
        $chapters = config('azkar_topics.chapters', []);
        $titles = config('azkar.chapter_titles_ar', []);
        $splitTags = config('azkar.split_topics', []);

        if (! is_array($topics) || ! is_array($chapters) || ! is_array($titles) || ! is_array($splitTags)) {
            $this->error('config azkar_topics.topics and azkar_topics.chapters, azkar.chapter_titles_ar and azkar.split_topics must be arrays.');

            return self::FAILURE;
        }

        $plan = $policy->resolve($topics, $chapters, $splitTags);
        $problems = [];

        foreach (array_keys($titles) as $chapter) {
            if (! array_key_exists($chapter, $chapters)) {
                $problems[] = sprintf('chapter %s: missing (no row in config azkar_topics.chapters)', (string) $chapter);
            }
        }

        foreach (array_keys($chapters) as $chapter) {
            if (! is_int($chapter) || ! array_key_exists($chapter, $titles)) {
                $problems[] = sprintf('%s: not a chapter of config azkar.chapter_titles_ar', (string) $chapter);
            }
        }

        foreach ($this->duplicatedChapters() as $chapter) {
            $problems[] = sprintf('chapter %s: more than one row in config azkar_topics.chapters', (string) $chapter);
        }

        foreach ($plan->errors as $chapter => $reason) {
            $problems[] = sprintf('chapter %s: invalid row (%s)', (string) $chapter, $reason);
        }

        $this->printCounts($plan->counts, array_keys($topics));
        $this->info(sprintf('Reviewed rows applied: %d', count($plan->topics) + count($plan->splits)));

        if ($plan->candidates !== []) {
            $this->warn(sprintf('%d candidate row(s) are not applied; only reviewed rows take effect.', count($plan->candidates)));

            if ($this->output->isVerbose()) {
                foreach ($plan->candidates as $chapter) {
                    $this->line('  candidate: chapter '.$chapter);
                }
            }
        }

        foreach ($problems as $problem) {
            $this->error($problem);
        }

        if ($problems !== []) {
            $this->error(sprintf('azkar:topics-check failed with %d problem(s).', count($problems)));

            return self::FAILURE;
        }

        $this->info('azkar:topics-check passed.');

        return self::SUCCESS;
    }

    /**
     * @param  array<string, array<string, int>>  $counts  Topic or split tag => status => number of rows
     * @param  list<mixed>  $topicIds  The topics of config azkar_topics.php, in order; each gets a row even at zero
     */
    private function printCounts(array $counts, array $topicIds): void
    {
        $targets = [];

        foreach ([...$topicIds, ...array_keys($counts)] as $target) {
            if (is_string($target) && ! in_array($target, $targets, true)) {
                $targets[] = $target;
            }
        }

        $rows = [];

        foreach ($targets as $target) {
            $rows[] = [$target, $counts[$target][TopicPolicy::REVIEWED] ?? 0, $counts[$target][TopicPolicy::CANDIDATE] ?? 0];
        }

        $this->table(['Topic or split tag', 'Reviewed', 'Candidate'], $rows);
    }

    /**
     * Chapter numbers that have more than one row in the source file. A PHP array keeps only the last duplicate key, so the
     * check reads the file itself.
     *
     * @return list<int>
     */
    private function duplicatedChapters(): array
    {
        $path = config_path('azkar_topics.php');

        if (! is_file($path)) {
            return [];
        }

        preg_match_all('/^\s+(\d+) => \[/m', (string) file_get_contents($path), $matches);

        $duplicates = [];

        foreach (array_count_values($matches[1]) as $chapter => $count) {
            if ($count > 1) {
                $duplicates[] = (int) $chapter;
            }
        }

        return $duplicates;
    }
}

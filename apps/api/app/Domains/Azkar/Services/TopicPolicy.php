<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Data\TopicPlan;

/**
 * Decides which chapter rows of config azkar_topics.php take effect (ADR 0092 decisions 1-2).
 *
 * - `reviewed`: set by the developer. Applied in every environment.
 * - `candidate`: drafted by Claude. Never applied, in any environment; listed as a warning.
 *
 * A row names exactly one of a topic (an id of `topics`) or a split (a catalogue tag of config azkar.split_topics). Every
 * row needs a known status and a non-empty `evidence`, whatever its status. A row that breaks one of these is an error
 * and is not applied. There is no environment switch.
 */
final class TopicPolicy
{
    public const string REVIEWED = 'reviewed';

    public const string CANDIDATE = 'candidate';

    public const string REASON_MALFORMED_CHAPTER = 'malformed_chapter';

    public const string REASON_MALFORMED_ROW = 'malformed_row';

    public const string REASON_UNKNOWN_TOPIC = 'unknown_topic';

    public const string REASON_UNKNOWN_SPLIT = 'unknown_split';

    public const string REASON_UNKNOWN_STATUS = 'unknown_status';

    public const string REASON_MISSING_EVIDENCE = 'missing_evidence';

    /**
     * @param  array<array-key, mixed>  $topics  The `topics` map of config azkar_topics.php: topic id => names.
     * @param  array<array-key, mixed>  $chapters  The `chapters` map of config azkar_topics.php: chapter number => row.
     * @param  array<array-key, mixed>  $splitTags  Config azkar.split_topics: catalogue tag id => its split topics.
     */
    public function resolve(array $topics, array $chapters, array $splitTags): TopicPlan
    {
        $topicIds = array_flip(array_filter(array_keys($topics), is_string(...)));
        $splitIds = array_flip(array_filter(array_keys($splitTags), is_string(...)));
        $reviewedTopics = [];
        $reviewedSplits = [];
        $candidates = [];
        $errors = [];
        $counts = [];

        foreach ($chapters as $chapter => $row) {
            if (! is_int($chapter) || $chapter < 1) {
                $errors[(string) $chapter] = self::REASON_MALFORMED_CHAPTER;

                continue;
            }

            $reason = $this->reasonFor($row, $topicIds, $splitIds);

            if ($reason !== null) {
                $errors[(string) $chapter] = $reason;

                continue;
            }

            /** @var array{topic?: string, split?: string, status: string} $row */
            $target = $row['topic'] ?? $row['split'] ?? '';
            $counts[$target][$row['status']] = ($counts[$target][$row['status']] ?? 0) + 1;

            if ($row['status'] === self::CANDIDATE) {
                $candidates[] = $chapter;

                continue;
            }

            if (isset($row['topic'])) {
                $reviewedTopics[$chapter] = $row['topic'];
            } else {
                $reviewedSplits[$chapter] = $row['split'] ?? '';
            }
        }

        return new TopicPlan(
            topics: $reviewedTopics,
            splits: $reviewedSplits,
            candidates: $candidates,
            errors: $errors,
            counts: $counts,
        );
    }

    /**
     * @param  array<string, int>  $topicIds  Known topic ids as keys.
     * @param  array<string, int>  $splitIds  Known split tag ids as keys.
     * @return string|null The first reason the row is malformed, or null when it is well-formed.
     */
    private function reasonFor(mixed $row, array $topicIds, array $splitIds): ?string
    {
        if (! is_array($row)) {
            return self::REASON_MALFORMED_ROW;
        }

        $hasTopic = array_key_exists('topic', $row);
        $hasSplit = array_key_exists('split', $row);

        if ($hasTopic === $hasSplit) {
            return self::REASON_MALFORMED_ROW;
        }

        if ($hasTopic && (! is_string($row['topic']) || ! isset($topicIds[$row['topic']]))) {
            return self::REASON_UNKNOWN_TOPIC;
        }

        if ($hasSplit && (! is_string($row['split']) || ! isset($splitIds[$row['split']]))) {
            return self::REASON_UNKNOWN_SPLIT;
        }

        $status = $row['status'] ?? null;
        $evidence = $row['evidence'] ?? null;

        if (! is_string($status) || ! in_array($status, [self::REVIEWED, self::CANDIDATE], true)) {
            return self::REASON_UNKNOWN_STATUS;
        }

        if (! is_string($evidence) || trim($evidence) === '') {
            return self::REASON_MISSING_EVIDENCE;
        }

        return null;
    }
}

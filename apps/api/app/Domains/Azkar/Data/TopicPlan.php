<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

/**
 * What config azkar_topics.php says about the chapters, after TopicPolicy has read it (ADR 0092 decisions 1-2).
 *
 * - `topics`: chapter number => topic id, for reviewed rows only. These are the only rows that take effect.
 * - `splits`: chapter number => catalogue tag id, for reviewed rows with 'split'. The chapter keeps that tag only.
 * - `candidates`: chapter numbers whose row is still a candidate. Never applied; reported as warnings.
 * - `errors`: chapter key => reason, for rows that are malformed or name an unknown topic or split tag. A key that is not a
 *   chapter number is kept as given. An errored row is not applied. Each row carries its first reason only.
 * - `counts`: topic id or split tag => status => number of well-formed rows.
 *
 * Holds ids, numbers and reasons only, never Azkar text.
 */
final class TopicPlan extends Data
{
    /**
     * @param  array<int, string>  $topics
     * @param  array<int, string>  $splits
     * @param  list<int>  $candidates
     * @param  array<int|string, string>  $errors
     * @param  array<string, array<string, int>>  $counts
     */
    public function __construct(
        public readonly array $topics,
        public readonly array $splits,
        public readonly array $candidates,
        public readonly array $errors,
        public readonly array $counts,
    ) {}
}

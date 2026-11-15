<?php

declare(strict_types=1);

namespace App\Domains\Duas\Services;

/**
 * Decides which rows of config/duas_topics.php take effect (ADR 0092 decisions 2 and 10; pattern of TopicPolicy).
 *
 * - `reviewed`: set by the developer. Applied in every environment.
 * - `candidate`: drafted by Claude. Never applied, in any environment; listed as a candidate.
 *
 * Every row needs a known status, a non-empty `evidence`, a `topic` that is an id of config azkar_topics.php `topics`,
 * and a target key of the form `quran:<surah>:<verse>` or `hadithchapter:<collection>:<book>:<ordinal>`. A row that
 * breaks one of these is listed as invalid and is not applied. Whether a reviewed quran key is an accepted Quranic dua
 * is decided by the planner, which skips a rejected or absent key without an issue.
 */
final class DuasTopicPolicy
{
    public const string REVIEWED = 'reviewed';

    public const string CANDIDATE = 'candidate';

    public const string TARGET_QURAN = 'quran';

    public const string TARGET_HADITH_CHAPTER = 'hadith_chapter';

    private const string QURAN_KEY_PATTERN = '/^quran:[1-9][0-9]*:[1-9][0-9]*$/';

    private const string HADITH_CHAPTER_KEY_PATTERN = '/^hadithchapter:[a-z]+:[1-9][0-9]*:[1-9][0-9]*$/';

    /**
     * @param  array<array-key, mixed>  $config  config/duas_topics.php: `quran` and `hadith_chapters` maps, key => row.
     * @param  list<string>  $knownTopicIds  The ids of config azkar_topics.php `topics`.
     * @return array{
     *     links: list<array{topic_id: string, target_kind: string, target_key: string}>,
     *     candidates: list<string>,
     *     invalid: list<string>
     * }
     */
    public function resolve(array $config, array $knownTopicIds): array
    {
        $topicIds = array_flip($knownTopicIds);
        $links = [];
        $candidates = [];
        $invalid = [];

        foreach ([self::TARGET_QURAN => 'quran', self::TARGET_HADITH_CHAPTER => 'hadith_chapters'] as $kind => $section) {
            $rows = $config[$section] ?? [];

            if (! is_array($rows)) {
                $invalid[] = $section;

                continue;
            }

            foreach ($rows as $key => $row) {
                $key = (string) $key;

                if (! $this->isWellFormed($kind, $key, $row, $topicIds)) {
                    $invalid[] = $key;

                    continue;
                }

                /** @var array{topic: string, status: string} $row */
                if ($row['status'] === self::CANDIDATE) {
                    $candidates[] = $key;

                    continue;
                }

                $links[] = ['topic_id' => $row['topic'], 'target_kind' => $kind, 'target_key' => $key];
            }
        }

        return ['links' => $links, 'candidates' => $candidates, 'invalid' => $invalid];
    }

    /**
     * @param  array<string, int>  $topicIds  Known topic ids as keys.
     */
    private function isWellFormed(string $kind, string $key, mixed $row, array $topicIds): bool
    {
        if (! is_array($row)) {
            return false;
        }

        $pattern = $kind === self::TARGET_QURAN ? self::QURAN_KEY_PATTERN : self::HADITH_CHAPTER_KEY_PATTERN;

        if (preg_match($pattern, $key) !== 1) {
            return false;
        }

        $topic = $row['topic'] ?? null;
        $status = $row['status'] ?? null;
        $evidence = $row['evidence'] ?? null;

        return is_string($topic)
            && isset($topicIds[$topic])
            && is_string($status)
            && in_array($status, [self::REVIEWED, self::CANDIDATE], true)
            && is_string($evidence)
            && trim($evidence) !== '';
    }
}

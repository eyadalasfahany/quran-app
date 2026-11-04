<?php

declare(strict_types=1);

namespace App\Domains\Duas\Services;

/**
 * Which rows of config/duas_quran_map.php an import may use (ADR 0044-duas §2, §6).
 *
 * - `reviewed` and `added`: accepted everywhere.
 * - `candidate`: accepted outside production, with a warning.
 * - `rejected`: skipped silently.
 */
final class QuranDuaReferencePolicy
{
    public const string REVIEWED = 'reviewed';

    public const string ADDED = 'added';

    public const string CANDIDATE = 'candidate';

    public const string REJECTED = 'rejected';

    public const string DECISION_ACCEPT = 'accept';

    public const string DECISION_WARN_CANDIDATE = 'warn_candidate';

    public const string DECISION_BLOCK = 'block';

    public const string DECISION_SKIP = 'skip';

    public const string DECISION_INVALID = 'invalid';

    /**
     * @param  array<array-key, mixed>  $row  One config/duas_quran_map.php row, unvalidated: every field is checked below.
     * @return array{surah: int, from: int, to: int|null, status: string, rule: string|null}|null
     */
    public function parse(array $row): ?array
    {
        if (! isset($row[0], $row[1]) || ! is_int($row[0]) || ! is_int($row[1]) || $row[0] < 1 || $row[1] < 1) {
            return null;
        }

        $to = $row[2] ?? null;

        if ($to !== null && (! is_int($to) || $to < $row[1])) {
            return null;
        }

        $status = $row['status'] ?? null;

        if (! is_string($status)) {
            return null;
        }

        $rule = $row['rule'] ?? null;

        return [
            'surah' => $row[0],
            'from' => $row[1],
            'to' => $to,
            'status' => $status,
            'rule' => is_string($rule) ? $rule : null,
        ];
    }

    public function decide(string $status): string
    {
        return match ($status) {
            self::REVIEWED, self::ADDED => self::DECISION_ACCEPT,
            self::CANDIDATE => $this->candidatesAccepted() ? self::DECISION_WARN_CANDIDATE : self::DECISION_BLOCK,
            self::REJECTED => self::DECISION_SKIP,
            default => self::DECISION_INVALID,
        };
    }

    public function candidatesAccepted(): bool
    {
        return ! app()->isProduction();
    }
}

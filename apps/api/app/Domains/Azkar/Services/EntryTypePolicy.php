<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Data\EntryTypePlan;
use App\Domains\Azkar\Enums\AzkarEntryClass;

/**
 * Decides which rows of config azkar_entry_types.php take effect (plan docs/plans/azkar-duas-split.md).
 *
 * - `reviewed`: set by the developer. Applied in every environment.
 * - `candidate`: drafted by Claude. Never applied, in any environment; listed as a warning.
 *
 * Every row needs a known `type` and `status` and a non-empty `evidence`, whatever its status. A row that breaks
 * one of these is an error. There is no environment switch.
 */
final class EntryTypePolicy
{
    public const string REVIEWED = 'reviewed';

    public const string CANDIDATE = 'candidate';

    public const string REASON_MALFORMED_ROW = 'malformed_row';

    public const string REASON_MALFORMED_KEY = 'malformed_key';

    public const string REASON_UNKNOWN_TYPE = 'unknown_type';

    public const string REASON_UNKNOWN_STATUS = 'unknown_status';

    public const string REASON_MISSING_EVIDENCE = 'missing_evidence';

    /**
     * @param  array<array-key, mixed>  $entries  The `entries` map of config azkar_entry_types.php
     */
    public function resolve(array $entries): EntryTypePlan
    {
        $types = [];
        $candidates = [];
        $errors = [];
        $counts = [];

        foreach ($entries as $entryKey => $row) {
            if (! is_string($entryKey) || $entryKey === '') {
                $errors['index '.$entryKey] = self::REASON_MALFORMED_KEY;

                continue;
            }

            $reason = $this->reasonFor($row);

            if ($reason !== null) {
                $errors[$entryKey] = $reason;

                continue;
            }

            /** @var array{type: string, status: string} $row */
            $class = AzkarEntryClass::from($row['type']);
            $counts[$class->value][$row['status']] = ($counts[$class->value][$row['status']] ?? 0) + 1;

            if ($row['status'] === self::REVIEWED) {
                $types[$entryKey] = $class;

                continue;
            }

            $candidates[] = $entryKey;
        }

        return new EntryTypePlan(types: $types, candidates: $candidates, errors: $errors, counts: $counts);
    }

    /**
     * @return string|null The first reason the row is malformed, or null when it is well-formed.
     */
    private function reasonFor(mixed $row): ?string
    {
        if (! is_array($row)) {
            return self::REASON_MALFORMED_ROW;
        }

        $type = $row['type'] ?? null;
        $status = $row['status'] ?? null;
        $evidence = $row['evidence'] ?? null;

        if (! is_string($type) || AzkarEntryClass::tryFrom($type) === null) {
            return self::REASON_UNKNOWN_TYPE;
        }

        if (! is_string($status) || ! in_array($status, [self::REVIEWED, self::CANDIDATE], true)) {
            return self::REASON_UNKNOWN_STATUS;
        }

        if (! is_string($evidence) || trim($evidence) === '') {
            return self::REASON_MISSING_EVIDENCE;
        }

        return null;
    }
}

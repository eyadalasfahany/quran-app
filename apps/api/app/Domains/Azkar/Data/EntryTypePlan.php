<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use App\Domains\Azkar\Enums\AzkarEntryClass;
use Spatie\LaravelData\Data;

/**
 * What config azkar_entry_types.php says about the entries, after the policy has read it.
 *
 * - `types`: entry_key => class, for reviewed rows only. These are the only rows that take effect.
 * - `candidates`: entry keys whose row is still a candidate. Never applied; reported as warnings.
 * - `errors`: entry_key => reason, for rows that are malformed (unknown type or status, missing evidence). Each row
 *   carries its first reason only.
 * - `counts`: type => status => number of well-formed rows. Malformed rows are not counted.
 *
 * Holds keys and reasons only, never Azkar text.
 */
final class EntryTypePlan extends Data
{
    /**
     * @param  array<string, AzkarEntryClass>  $types
     * @param  list<string>  $candidates
     * @param  array<string, string>  $errors
     * @param  array<string, array<string, int>>  $counts
     */
    public function __construct(
        public readonly array $types,
        public readonly array $candidates,
        public readonly array $errors,
        public readonly array $counts,
    ) {}

    public function hasErrors(): bool
    {
        return $this->errors !== [];
    }
}

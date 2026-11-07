<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Import\Records;

/**
 * The outcome for one collection in one run. Failure is a domain message or a class name, never hadith text.
 */
final readonly class CollectionImportResult
{
    public const string STATUS_IMPORTED = 'imported';

    public const string STATUS_UNCHANGED = 'unchanged';

    public const string STATUS_VALID = 'valid';

    public const string STATUS_INVALID = 'invalid';

    public const string STATUS_FAILED = 'failed';

    public const string STATUS_NO_SNAPSHOT = 'no_snapshot';

    public const string STATUS_VERIFIED = 'verified';

    public const string STATUS_INTEGRITY_FAILED = 'integrity_failed';

    public const string STATUS_HELD_BACK = 'held_back';

    /**
     * @param  list<HadithIssue>  $issues
     * @param  array<string, bool|int|string|null>  $pack
     */
    public function __construct(
        public string $slug,
        public string $status,
        public ?string $failure,
        public ?CollectionStats $stats,
        public array $issues,
        public bool $fingerprintUnchanged,
        public ?string $fingerprint,
        public ?int $resourceId,
        public ?int $versionBefore,
        public ?int $versionAfter,
        public array $pack,
        public ?IntegrityResult $integrity,
        public ?bool $complete = null,
        public ?int $incompleteCount = null,
    ) {}

    public function failed(): bool
    {
        if (in_array($this->status, [self::STATUS_INVALID, self::STATUS_FAILED, self::STATUS_INTEGRITY_FAILED], true)) {
            return true;
        }

        return ($this->pack['error'] ?? null) !== null;
    }
}

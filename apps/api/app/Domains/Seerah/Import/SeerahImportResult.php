<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Import;

use App\Domains\Seerah\Validation\Issue;

/**
 * What one import did: imported (rows written, version bumped), unchanged (same fingerprint, nothing written) or refused (the
 * validator reported an error, nothing written). Counts and ids only, never text.
 */
final readonly class SeerahImportResult
{
    public const string IMPORTED = 'imported';

    public const string UNCHANGED = 'unchanged';

    public const string REFUSED = 'refused';

    /**
     * @param  array<string, int>  $counts  table => rows
     * @param  array<string, bool|int|string>|null  $pack
     * @param  list<Issue>  $issues
     */
    public function __construct(
        public string $status,
        public ?int $resourceId,
        public ?int $versionBefore,
        public ?int $versionAfter,
        public array $counts,
        public ?array $pack,
        public array $issues,
    ) {}

    /**
     * @param  array<string, int>  $counts
     * @param  array<string, bool|int|string>|null  $pack
     * @param  list<Issue>  $issues
     */
    public static function imported(int $resourceId, int $versionBefore, int $versionAfter, array $counts, ?array $pack, array $issues): self
    {
        return new self(self::IMPORTED, $resourceId, $versionBefore, $versionAfter, $counts, $pack, $issues);
    }

    /**
     * @param  array<string, int>  $counts
     * @param  array<string, bool|int|string>|null  $pack
     * @param  list<Issue>  $issues
     */
    public static function unchanged(int $resourceId, int $version, array $counts, ?array $pack, array $issues): self
    {
        return new self(self::UNCHANGED, $resourceId, $version, $version, $counts, $pack, $issues);
    }

    /**
     * @param  list<Issue>  $issues
     */
    public static function refused(array $issues): self
    {
        return new self(self::REFUSED, null, null, null, [], null, $issues);
    }
}

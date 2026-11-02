<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Data;

use Spatie\LaravelData\Data;

/**
 * The import report (ADR 0031 §3). Written as JSON to storage/app/azkar/reports and printed as a table.
 */
final class ImportReport extends Data
{
    public const string STATUS_VALID = 'valid';

    public const string STATUS_INVALID = 'invalid';

    public const string STATUS_IMPORTED = 'imported';

    public const string STATUS_UNCHANGED = 'unchanged';

    /**
     * @param  array<string, mixed>  $source
     * @param  array<string, mixed>  $content
     * @param  array<string, mixed>  $sourced
     * @param  array<string, mixed>  $gated
     * @param  array<string, mixed>  $changedUpstreamTexts
     * @param  array<string, mixed>  $resource
     * @param  list<array{severity: string, code: string, path: string, entry: string|null}>  $issues
     */
    public function __construct(
        public readonly string $generatedAt,
        public readonly bool $dryRun,
        public readonly string $status,
        public readonly array $source,
        public readonly array $content,
        public readonly array $sourced,
        public readonly array $gated,
        public readonly array $changedUpstreamTexts,
        public readonly array $resource,
        public readonly array $issues,
    ) {}

    /**
     * The report as written to disk, with snake_case keys. Holds counts, keys and paths only.
     *
     * @return array<string, mixed>
     */
    public function toReport(): array
    {
        return [
            'generated_at' => $this->generatedAt,
            'mode' => $this->dryRun ? 'dry-run' : 'import',
            'status' => $this->status,
            'source' => $this->source,
            'content' => $this->content,
            'sourced' => $this->sourced,
            'gated' => $this->gated,
            'changed_upstream_texts' => $this->changedUpstreamTexts,
            'resource' => $this->resource,
            'issues' => $this->issues,
        ];
    }

    public function succeeded(): bool
    {
        return in_array($this->status, [self::STATUS_VALID, self::STATUS_IMPORTED, self::STATUS_UNCHANGED], true);
    }

    /**
     * @return list<array{severity: string, code: string, path: string, entry: string|null}>
     */
    public function errors(): array
    {
        return array_values(array_filter($this->issues, fn (array $issue): bool => $issue['severity'] === ImportIssue::ERROR));
    }

    /**
     * @return list<array{severity: string, code: string, path: string, entry: string|null}>
     */
    public function warnings(): array
    {
        return array_values(array_filter($this->issues, fn (array $issue): bool => $issue['severity'] === ImportIssue::WARNING));
    }
}

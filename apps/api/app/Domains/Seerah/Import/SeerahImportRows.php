<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Import;

/**
 * The rows of every seerah_* table for one import, keyed by table name. A row has no resource_id, source_id or imported_at: the
 * repository adds those, so the fingerprint depends on the content only. Immutable.
 */
final readonly class SeerahImportRows
{
    /**
     * @param  array<string, list<array<string, int|float|string|null>>>  $tables  table name => rows
     */
    public function __construct(public array $tables) {}

    /**
     * @return list<array<string, int|float|string|null>>
     */
    public function rows(string $table): array
    {
        return $this->tables[$table] ?? [];
    }

    /**
     * SHA-256 of the canonical JSON of every row. Equal fingerprints mean an import would write the same rows (ADR 0089, no-op).
     */
    public function fingerprint(): string
    {
        return hash('sha256', json_encode(
            $this->tables,
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION,
        ));
    }

    /**
     * @return array<string, int>
     */
    public function counts(): array
    {
        return array_map(count(...), $this->tables);
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Repositories\Contracts;

use App\Domains\Seerah\Import\SeerahImportRows;
use Carbon\CarbonImmutable;

/**
 * Persistence of one Seerah import (ADR 0089, step 23). Every method scopes by resource_id. The caller holds the transaction.
 */
interface SeerahImportRepository
{
    public function hasBook(int $resourceId): bool;

    /**
     * Deletes every seerah_* row of the resource and writes the new rows, children last, in chunks.
     */
    public function replace(int $resourceId, SeerahImportRows $rows, int $sourceId, CarbonImmutable $importedAt): void;

    /**
     * The stored paragraphs keyed by paragraph number: the text and its SHA-256, as written.
     *
     * @return array<int, array{text_ar: string, text_sha256: string}>
     */
    public function paragraphs(int $resourceId): array;
}

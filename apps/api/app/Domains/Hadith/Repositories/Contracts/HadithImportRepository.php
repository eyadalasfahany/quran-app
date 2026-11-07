<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Repositories\Contracts;

use App\Domains\Content\Models\ContentSource;
use App\Domains\Hadith\Import\Records\HadithImportPlan;

/**
 * Persistence for one hadith import. The service owns the transaction.
 */
interface HadithImportRepository
{
    public function source(string $code): ?ContentSource;

    /**
     * @return array{total: int, entries: int, complete: bool, incomplete: int}|null total_hadith and the stored completeness of the collection row, and the real entry count; null when there is no collection row
     */
    public function storedCounts(int $resourceId): ?array;

    public function replaceForResource(int $resourceId, HadithImportPlan $plan): void;

    /**
     * @return \Generator<int, array{source_key: string, text_ar: string, source_text_sha256: string}>
     */
    public function entryTexts(int $resourceId): \Generator;
}

<?php

declare(strict_types=1);

namespace App\Domains\Content\Packs;

use App\Domains\Hadith\Models\HadithCollection;

/**
 * ADR 0076 «Rule, 7 Nov 2026»: a hadith collection is packed only when every hadith number of its numbering is resolved.
 * An incomplete or not-yet-imported collection has no pack; the importer holds it back (step 6b.1).
 */
final class HadithPackReadiness
{
    /**
     * @throws PackBuildException
     */
    public function assertReady(int $resourceId): void
    {
        $collection = HadithCollection::query()->where('resource_id', $resourceId)->first();

        if ($collection === null || $collection->is_complete !== true) {
            throw new PackBuildException(
                'The Hadith collection is incomplete or not imported. The pack is not built.',
            );
        }
    }
}

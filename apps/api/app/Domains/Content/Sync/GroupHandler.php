<?php

declare(strict_types=1);

namespace App\Domains\Content\Sync;

use App\Domains\Content\Data\ContentChangeData;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\Resource;
use App\Integrations\QuranFoundation\CatalogEntry;
use App\Integrations\QuranFoundation\Mutation;
use App\Integrations\QuranFoundation\Snapshot;

interface GroupHandler
{
    public function group(): ResourceGroup;

    public function usesCatalog(): bool;

    /**
     * @return list<CatalogEntry>
     */
    public function catalog(): array;

    /**
     * @return int<0, max>
     */
    public function replaceFromSnapshot(Resource $resource, Snapshot $snapshot): int;

    /**
     * Returns null when the mutation changed nothing on our side (a skipped QF record). The sync still advances
     * last_sequence in that case.
     */
    public function applyRow(Resource $resource, Mutation $mutation): ?ContentChangeData;
}

<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Repositories\Contracts;

use App\Domains\Seerah\Models\SeerahBook;
use Illuminate\Database\Eloquent\Collection;

/**
 * Read side of the Seerah catalogue (ADR 0089, step 25). A book is served only when the content manifest lists its resource.
 */
interface SeerahCatalogueRepository
{
    /**
     * @param  list<int>  $resourceIds
     * @return Collection<int, SeerahBook>
     */
    public function books(array $resourceIds): Collection;
}

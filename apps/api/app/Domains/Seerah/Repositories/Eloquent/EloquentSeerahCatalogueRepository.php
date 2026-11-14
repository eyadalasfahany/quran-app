<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Repositories\Eloquent;

use App\Domains\Seerah\Models\SeerahBook;
use App\Domains\Seerah\Repositories\Contracts\SeerahCatalogueRepository;
use App\Support\Repositories\EloquentRepository;
use Illuminate\Database\Eloquent\Collection;

/**
 * @extends EloquentRepository<SeerahBook>
 */
final class EloquentSeerahCatalogueRepository extends EloquentRepository implements SeerahCatalogueRepository
{
    protected function model(): string
    {
        return SeerahBook::class;
    }

    public function books(array $resourceIds): Collection
    {
        if ($resourceIds === []) {
            return new Collection;
        }

        /** @var Collection<int, SeerahBook> $books */
        $books = $this->query()
            ->whereIn('resource_id', $resourceIds)
            ->orderBy('resource_id')
            ->get();

        return $books;
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Services;

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Services\ContentDeliveryService;
use App\Domains\Seerah\Data\SeerahBookData;
use App\Domains\Seerah\Models\SeerahBook;
use App\Domains\Seerah\Repositories\Contracts\SeerahCatalogueRepository;

/**
 * Read side of the Seerah catalogue (ADR 0091, step 25). Only books whose resource the content manifest serves are listed.
 */
final class SeerahCatalogueService
{
    public function __construct(
        private readonly ContentDeliveryService $delivery,
        private readonly SeerahCatalogueRepository $repository,
    ) {}

    /**
     * @return list<SeerahBookData>
     */
    public function books(): array
    {
        $books = $this->repository->books($this->delivery->servedResourceIds(ResourceGroup::Seerah));

        return array_values(array_map($this->bookData(...), $books->all()));
    }

    private function bookData(SeerahBook $book): SeerahBookData
    {
        return new SeerahBookData(
            resourceId: $book->resource_id,
            slug: $book->slug,
            titleAr: $book->title_ar,
            authorAr: $book->author_ar,
            editionAr: $book->edition_ar,
            attributionAr: $book->attribution_ar,
            attributionEn: $book->attribution_en,
            sectionsCount: $book->sections_count,
            paragraphsCount: $book->paragraphs_count,
            placesCount: $book->places_count,
            eventsCount: $book->events_count,
            routesCount: $book->routes_count,
        );
    }
}

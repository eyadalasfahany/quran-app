<?php

declare(strict_types=1);

namespace App\Domains\Content\Packs;

use App\Domains\Seerah\Repositories\Contracts\SeerahImportRepository;

/**
 * ADR 0091, step 24: a Seerah pack is built only from a book that the importer has written. The importer is the only place that
 * checks the data against the release rules, so a resource with no imported book has no pack.
 */
final class SeerahPackReadiness
{
    public function __construct(private readonly SeerahImportRepository $books) {}

    /**
     * @throws PackBuildException
     */
    public function assertReady(int $resourceId): void
    {
        if (! $this->books->hasBook($resourceId)) {
            throw new PackBuildException('The Seerah book is not imported. The pack is not built.');
        }
    }
}

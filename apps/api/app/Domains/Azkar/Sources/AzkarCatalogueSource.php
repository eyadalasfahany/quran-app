<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Sources;

use App\Domains\Azkar\Data\ParsedCatalogue;
use App\Domains\Azkar\Exceptions\CatalogueUnreadableException;

/**
 * One Azkar source (ADR 0031 §12). A source turns its own location (an OpenDua catalogue file, or a hisnmuslim
 * snapshot directory) into the catalogue shape the validator and transformer already understand. The import itself
 * is the same for every source.
 */
interface AzkarCatalogueSource
{
    public function code(): string;

    public function profile(): SourceProfile;

    /**
     * @throws CatalogueUnreadableException When the location cannot be read, decoded or verified against its own manifest.
     */
    public function parse(string $location): ParsedCatalogue;
}

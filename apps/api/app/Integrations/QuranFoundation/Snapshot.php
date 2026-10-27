<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

final readonly class Snapshot
{
    /**
     * Records stay flat. Their fields depend on the resource group.
     *
     * @param  list<array<string, mixed>>  $records
     */
    public function __construct(
        public string $resourceGroup,
        public int $resourceId,
        public ?int $resourceContentId,
        public int $schemaVersion,
        public int $syncSequence,
        public array $records,
    ) {}
}

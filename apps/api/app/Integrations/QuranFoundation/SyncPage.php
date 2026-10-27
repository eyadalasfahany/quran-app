<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

final readonly class SyncPage
{
    /**
     * @param  list<Mutation>  $mutations
     */
    public function __construct(
        public int $syncUntilSequence,
        public bool $hasMore,
        public ?string $nextPageUrl,
        public string $nextSyncToken,
        public array $mutations,
    ) {}
}

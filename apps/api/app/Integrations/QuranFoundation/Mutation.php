<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

final readonly class Mutation
{
    /**
     * @param  array<string, mixed>|null  $data
     */
    public function __construct(
        public int $sequence,
        public MutationType $type,
        public string $resourceGroup,
        public int $resourceId,
        public ?int $resourceContentId,
        public ?string $recordType,
        public ?string $recordKey,
        public ?string $sourceRecordId,
        public ?string $changedAt,
        public ?array $data,
        public ?string $snapshotUrl,
        public ?string $unavailableReason,
    ) {}
}

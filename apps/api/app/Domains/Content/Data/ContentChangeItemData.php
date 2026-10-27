<?php

declare(strict_types=1);

namespace App\Domains\Content\Data;

use App\Domains\Content\Enums\ChangeOperation;
use Spatie\LaravelData\Data;

final class ContentChangeItemData extends Data
{
    /**
     * @param  array<string, mixed>|null  $payload
     */
    public function __construct(
        public readonly int $id,
        public readonly int $version,
        public readonly string $entity,
        public readonly string $entityKey,
        public readonly ChangeOperation $op,
        public readonly ?array $payload,
    ) {}
}

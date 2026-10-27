<?php

declare(strict_types=1);

namespace App\Domains\Content\Data;

use App\Domains\Content\Enums\ChangeOperation;
use Spatie\LaravelData\Data;

final class ContentChangeData extends Data
{
    /**
     * Full shared-contract row, or null when the operation is a delete.
     *
     * @param  array<string, mixed>|null  $payload
     */
    public function __construct(
        public readonly string $entity,
        public readonly string $entityKey,
        public readonly ChangeOperation $op,
        public readonly ?array $payload,
    ) {}
}

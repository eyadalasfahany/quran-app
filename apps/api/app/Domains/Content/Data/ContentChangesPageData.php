<?php

declare(strict_types=1);

namespace App\Domains\Content\Data;

use Spatie\LaravelData\Data;

final class ContentChangesPageData extends Data
{
    /**
     * @param  list<ContentChangeItemData>  $items
     */
    public function __construct(
        public readonly array $items,
        public readonly ?string $nextCursor,
    ) {}
}

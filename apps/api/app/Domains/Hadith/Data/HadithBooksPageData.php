<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Data;

use Spatie\LaravelData\Data;

final class HadithBooksPageData extends Data
{
    /**
     * @param  list<HadithBookData>  $items
     */
    public function __construct(
        public readonly array $items,
        public readonly ?string $nextCursor,
    ) {}
}

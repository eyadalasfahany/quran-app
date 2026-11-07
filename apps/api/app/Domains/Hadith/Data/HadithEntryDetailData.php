<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Data;

use Spatie\LaravelData\Data;

final class HadithEntryDetailData extends Data
{
    public function __construct(
        public readonly HadithEntryData $entry,
        public readonly HadithCollectionData $collection,
        public readonly HadithBookData $book,
        public readonly ?HadithChapterData $chapter,
    ) {}
}

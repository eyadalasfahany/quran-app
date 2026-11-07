<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

/**
 * A hadithapi.com chapter: its id and its Arabic title exactly as received (null when empty). Nothing else is kept.
 */
final readonly class HadithApiComChapter
{
    public function __construct(
        public string $id,
        public ?string $titleAr,
    ) {}
}

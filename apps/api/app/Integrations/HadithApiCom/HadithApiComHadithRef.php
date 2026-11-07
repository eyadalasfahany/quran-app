<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

/**
 * A hadithapi.com hadith reference: its hadithNumber and the chapterNumber of its chapter. The API names that field chapterId,
 * but its value is the chapter's chapterNumber, never the chapter's id. Nothing else is kept (no text, no grades).
 */
final readonly class HadithApiComHadithRef
{
    public function __construct(
        public string $hadithNumber,
        public string $chapterNumber,
    ) {}
}

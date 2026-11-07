<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

/**
 * A hadithapi.com chapter: its chapterNumber, which is the value hadiths carry as chapterId (never the chapter's own id), and
 * its Arabic title exactly as received (null when empty). chapterNumber is null when it is missing or unusable; such a chapter
 * cannot match any hadith. Nothing else is kept.
 */
final readonly class HadithApiComChapter
{
    public function __construct(
        public ?string $chapterNumber,
        public ?string $titleAr,
    ) {}
}

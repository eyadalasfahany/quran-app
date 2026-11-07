<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

/**
 * A hadithapi.com hadith reference: its number and chapter id. Nothing else is kept (no text, no grades).
 */
final readonly class HadithApiComHadithRef
{
    public function __construct(
        public string $hadithNumber,
        public string $chapterId,
    ) {}
}

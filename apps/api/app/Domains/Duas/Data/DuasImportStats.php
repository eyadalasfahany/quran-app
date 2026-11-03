<?php

declare(strict_types=1);

namespace App\Domains\Duas\Data;

final class DuasImportStats
{
    public function __construct(
        public int $quranAccepted = 0,
        public int $quranSkipped = 0,
        public int $quranBlocked = 0,
        public int $hadithAccepted = 0,
        public int $linksAccepted = 0,
        public int $refsAccepted = 0,
        public int $booksAccepted = 0,
    ) {}
}

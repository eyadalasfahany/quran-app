<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Overlay;

/**
 * The validated shape of a committed chapters file (ADR 0076 §2.3, step 6b.5). partial_books is drop (option C) or keep (Q5).
 */
final readonly class ChapterFile
{
    public const string PARTIAL_DROP = 'drop';

    public const string PARTIAL_KEEP = 'keep';

    /**
     * @param  list<ChapterRecord>  $chapters  in file order
     */
    public function __construct(
        public string $collection,
        public string $release,
        public string $partialBooks,
        public array $chapters,
    ) {}
}

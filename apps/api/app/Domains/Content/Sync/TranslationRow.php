<?php

declare(strict_types=1);

namespace App\Domains\Content\Sync;

/**
 * One translation_entries row, before it is written.
 */
final readonly class TranslationRow
{
    /**
     * @param  array<mixed>|null  $footnotes
     */
    public function __construct(
        public int $verseId,
        public string $verseKey,
        public string $text,
        public ?array $footnotes,
        public ?int $sourceRecordId,
    ) {}
}

<?php

declare(strict_types=1);

namespace App\Integrations\HadithApiCom;

/**
 * A hadithapi.com record that lists a hadith number (ADR 0076 §8.6, step 6b.6): its id, the numbers its hadithNumber field
 * lists, and its Arabic text exactly as received. Nothing else of the record is kept.
 */
final readonly class HadithApiComRecord
{
    /**
     * @param  list<string>  $numbers
     */
    public function __construct(
        public string $id,
        public array $numbers,
        public string $textAr,
    ) {}
}

<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Contracts;

use App\Domains\Hadith\Exceptions\HadithPinException;
use App\Domains\Hadith\Exceptions\HadithSourceFormatException;
use App\Domains\Hadith\Sources\Records\SourceCollection;
use App\Domains\Hadith\Sources\Records\SourceCollectionInfo;
use App\Integrations\HadithApiFawaz\HadithApiFawazException;

/**
 * A source of hadith collections (ADR 0042 §3). Step 18's Sunnah.com source implements the same contract. There is no
 * chapter type yet: fawazahmed0 has none.
 */
interface HadithCollectionSource
{
    /**
     * The content_sources code, e.g. 'fawazahmed0'.
     */
    public function code(): string;

    /**
     * The pinned revision the data comes from (the commit SHA for fawazahmed0). Stored later as source_version.
     */
    public function version(): string;

    /**
     * Canonical slugs this source serves, in config('hadith.collections') order.
     *
     * @return list<string>
     */
    public function slugs(): array;

    /**
     * Counts and names from the source's index file, no hadith text.
     *
     * @throws HadithPinException
     * @throws HadithSourceFormatException
     * @throws HadithApiFawazException
     * @throws \InvalidArgumentException for a slug the source does not serve
     */
    public function info(string $slug): SourceCollectionInfo;

    /**
     * The whole collection.
     *
     * @throws HadithPinException
     * @throws HadithSourceFormatException
     * @throws HadithApiFawazException
     * @throws \InvalidArgumentException for a slug the source does not serve
     */
    public function collection(string $slug): SourceCollection;
}

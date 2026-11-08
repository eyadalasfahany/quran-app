<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Repositories\Contracts;

interface HadithExplanationRepository
{
    /**
     * Our hadith of one collection, in the order of the collection's own rows, without covering rows (a merged number has no
     * row of its own; ADR 0076). Only the number and the Arabic text: the text is used for matching, never printed.
     *
     * @return list<array{number: string, text: string}>
     */
    public function collectionHadith(string $collectionSlug): array;

    /**
     * Replaces the explanations and links of one resource in one go.
     *
     * @param  list<array<string, int|string|null>>  $explanations
     * @param  list<array<string, int|string|null>>  $links
     */
    public function replaceForResource(int $resourceId, array $explanations, array $links): void;
}

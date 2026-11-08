<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Repositories\Eloquent;

use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Models\HadithExplanation;
use App\Domains\Hadith\Models\HadithExplanationLink;
use App\Domains\Hadith\Repositories\Contracts\HadithExplanationRepository;

final class EloquentHadithExplanationRepository implements HadithExplanationRepository
{
    private const int CHUNK = 500;

    /**
     * @return list<array{number: string, text: string}>
     */
    public function collectionHadith(string $collectionSlug): array
    {
        $resourceId = HadithCollection::query()->where('slug', $collectionSlug)->value('resource_id');

        if ($resourceId === null) {
            return [];
        }

        $rows = HadithEntry::query()->toBase()
            ->where('resource_id', (int) $resourceId)
            ->whereNull('number_first')
            ->orderBy('position')
            ->get(['hadith_number', 'text_ar']);

        /** @var list<array{number: string, text: string}> $list */
        $list = $rows->map(static fn (object $row): array => [
            'number' => (string) $row->hadith_number,
            'text' => (string) $row->text_ar,
        ])->values()->all();

        return $list;
    }

    public function replaceForResource(int $resourceId, array $explanations, array $links): void
    {
        HadithExplanationLink::query()->where('resource_id', $resourceId)->delete();
        HadithExplanation::query()->where('resource_id', $resourceId)->delete();

        foreach (array_chunk($explanations, self::CHUNK) as $chunk) {
            HadithExplanation::query()->insert(array_map(
                static fn (array $row): array => ['resource_id' => $resourceId] + $row,
                $chunk,
            ));
        }

        foreach (array_chunk($links, self::CHUNK) as $chunk) {
            HadithExplanationLink::query()->insert(array_map(
                static fn (array $row): array => ['resource_id' => $resourceId] + $row,
                $chunk,
            ));
        }
    }
}

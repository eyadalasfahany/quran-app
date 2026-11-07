<?php

declare(strict_types=1);

namespace App\Domains\Hadith\Repositories\Eloquent;

use App\Domains\Content\Models\ContentSource;
use App\Domains\Hadith\Import\Records\HadithImportPlan;
use App\Domains\Hadith\Models\HadithBook;
use App\Domains\Hadith\Models\HadithChapter;
use App\Domains\Hadith\Models\HadithCollection;
use App\Domains\Hadith\Models\HadithEntry;
use App\Domains\Hadith\Models\HadithGrade;
use App\Domains\Hadith\Repositories\Contracts\HadithImportRepository;
use Illuminate\Database\Eloquent\Model;

final class EloquentHadithImportRepository implements HadithImportRepository
{
    private const int CHUNK = 250;

    private const int READ_CHUNK = 500;

    public function source(string $code): ?ContentSource
    {
        return ContentSource::query()->where('code', $code)->first();
    }

    public function storedCounts(int $resourceId): ?array
    {
        $collection = HadithCollection::query()->where('resource_id', $resourceId)->first();

        if ($collection === null) {
            return null;
        }

        return [
            'total' => (int) $collection->getAttribute('total_hadith'),
            'entries' => HadithEntry::query()->where('resource_id', $resourceId)->count(),
        ];
    }

    public function replaceForResource(int $resourceId, HadithImportPlan $plan): void
    {
        $this->delete(HadithGrade::class, $resourceId);
        $this->delete(HadithEntry::class, $resourceId);
        $this->delete(HadithChapter::class, $resourceId);
        $this->delete(HadithBook::class, $resourceId);
        $this->delete(HadithCollection::class, $resourceId);

        $this->insert(HadithCollection::class, $resourceId, [$plan->collection]);
        $this->insert(HadithBook::class, $resourceId, $plan->books);
        $this->insert(HadithChapter::class, $resourceId, $plan->chapters);
        $this->insert(HadithEntry::class, $resourceId, $plan->entries);
        $this->insert(HadithGrade::class, $resourceId, $plan->grades);
    }

    /**
     * Rows in chunks of 500 by id. Keys and hashes only are needed by the caller; the text is the stored value.
     *
     * @return \Generator<int, array{source_key: string, text_ar: string, source_text_sha256: string}>
     */
    public function entryTexts(int $resourceId): \Generator
    {
        $lastId = 0;

        while (true) {
            $rows = HadithEntry::query()
                ->select(['id', 'source_key', 'text_ar', 'source_text_sha256'])
                ->where('resource_id', $resourceId)
                ->where('id', '>', $lastId)
                ->orderBy('id')
                ->limit(self::READ_CHUNK)
                ->get();

            if ($rows->isEmpty()) {
                return;
            }

            foreach ($rows as $row) {
                $lastId = (int) $row->getAttribute('id');

                yield [
                    'source_key' => (string) $row->getAttribute('source_key'),
                    'text_ar' => (string) $row->getAttribute('text_ar'),
                    'source_text_sha256' => (string) $row->getAttribute('source_text_sha256'),
                ];
            }
        }
    }

    /**
     * @param  class-string<Model>  $model
     */
    private function delete(string $model, int $resourceId): void
    {
        $model::query()->where('resource_id', $resourceId)->delete();
    }

    /**
     * @param  class-string<Model>  $model
     * @param  list<array<string, int|string|null>>  $rows
     */
    private function insert(string $model, int $resourceId, array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK) as $chunk) {
            $model::query()->insert(array_map(
                static fn (array $row): array => ['resource_id' => $resourceId] + $row,
                $chunk,
            ));
        }
    }
}

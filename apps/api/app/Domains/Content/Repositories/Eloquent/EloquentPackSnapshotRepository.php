<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Models\MushafPage;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\RecitationTiming;
use App\Domains\Content\Models\TafsirEntry;
use App\Domains\Content\Models\TranslationEntry;
use App\Domains\Content\Models\WordLayout;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Content\Packs\PackColumn;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Packs\PackTable;
use App\Domains\Content\Repositories\Contracts\PackSnapshotRepository;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use stdClass;

final class EloquentPackSnapshotRepository implements PackSnapshotRepository
{
    public function eachChunk(int $resourceId, PackTable $table, callable $consume): void
    {
        $this->query($resourceId, $table)->chunk(PackSchema::CHUNK, function (Collection $rows) use ($table, $consume): void {
            $batch = [];

            foreach ($rows as $row) {
                $batch[] = $this->normalize($table, $row);
            }

            if ($batch !== []) {
                $consume($batch);
            }
        });
    }

    private function query(int $resourceId, PackTable $table): Builder
    {
        $query = match ($table->name) {
            'translation_entries' => TranslationEntry::query()->toBase()
                ->where('translation_entries.resource_id', $resourceId),
            'tafsir_entries' => TafsirEntry::query()->toBase()
                ->where('tafsir_entries.resource_id', $resourceId),
            'mushafs' => Mushaf::query()->toBase()
                ->where('mushafs.resource_id', $resourceId),
            'mushaf_pages' => MushafPage::query()->toBase()
                ->join('mushafs', 'mushafs.id', '=', 'mushaf_pages.mushaf_id')
                ->where('mushafs.resource_id', $resourceId),
            'word_layouts' => WordLayout::query()->toBase()
                ->join('mushafs', 'mushafs.id', '=', 'word_layouts.mushaf_id')
                ->where('mushafs.resource_id', $resourceId),
            'recitations' => Recitation::query()->toBase()
                ->where('recitations.resource_id', $resourceId),
            'chapter_audio_files' => ChapterAudioFile::query()->toBase()
                ->join('recitations', 'recitations.id', '=', 'chapter_audio_files.recitation_id')
                ->where('recitations.resource_id', $resourceId),
            'recitation_timings' => RecitationTiming::query()->toBase()
                ->join('chapter_audio_files', 'chapter_audio_files.id', '=', 'recitation_timings.audio_file_id')
                ->join('recitations', 'recitations.id', '=', 'chapter_audio_files.recitation_id')
                ->where('recitations.resource_id', $resourceId),
            default => throw new PackBuildException('Unknown pack table ['.$table->name.'].'),
        };

        foreach ($table->orderBy as $column) {
            $query->orderBy($table->name.'.'.$column);
        }

        return $query->select($this->selectList($table));
    }

    /**
     * @return list<string>
     */
    private function selectList(PackTable $table): array
    {
        return array_map(
            fn (PackColumn $column): string => $table->name.'.'.$column->name.' as '.$column->name,
            $table->columns,
        );
    }

    /**
     * @return array<string, int|string|null>
     */
    private function normalize(PackTable $table, stdClass $row): array
    {
        $normalized = [];

        foreach ($table->columns as $column) {
            if (! property_exists($row, $column->name)) {
                throw new PackBuildException('Pack row is missing column ['.$column->name.'].');
            }

            $normalized[$column->name] = $this->cell($column, $row->{$column->name});
        }

        return $normalized;
    }

    private function cell(PackColumn $column, mixed $value): int|string|null
    {
        if ($value === null) {
            if ($column->nullable) {
                return null;
            }

            throw new PackBuildException('Pack column ['.$column->name.'] is null.');
        }

        if ($column->integer) {
            if (is_int($value)) {
                return $value;
            }

            if (is_bool($value)) {
                return $value ? 1 : 0;
            }

            if (is_string($value) && preg_match('/^-?[0-9]+$/', $value) === 1) {
                return (int) $value;
            }

            throw new PackBuildException('Pack column ['.$column->name.'] is not an integer.');
        }

        if (is_string($value)) {
            return $value;
        }

        throw new PackBuildException('Pack column ['.$column->name.'] is not text.');
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Content\Repositories\Eloquent;

use App\Domains\Content\Models\AzkarCategory;
use App\Domains\Content\Models\AzkarChapter;
use App\Domains\Content\Models\AzkarEntry;
use App\Domains\Content\Models\AzkarEntryCategory;
use App\Domains\Content\Models\AzkarItem;
use App\Domains\Content\Models\AzkarNote;
use App\Domains\Content\Models\AzkarRecording;
use App\Domains\Content\Models\AzkarSegment;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Models\MushafPage;
use App\Domains\Content\Models\Name;
use App\Domains\Content\Models\NamesList;
use App\Domains\Content\Models\NamesNote;
use App\Domains\Content\Models\NamesVerse;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\RecitationTiming;
use App\Domains\Content\Models\TafsirEntry;
use App\Domains\Content\Models\TaybahRecitationTiming;
use App\Domains\Content\Models\WordLayout;
use App\Domains\Content\Packs\PackBuildException;
use App\Domains\Content\Packs\PackColumn;
use App\Domains\Content\Packs\PackSchema;
use App\Domains\Content\Packs\PackTable;
use App\Domains\Content\Repositories\Contracts\PackSnapshotRepository;
use App\Domains\Duas\Models\DuaCollectionBook;
use App\Domains\Duas\Models\DuaCollectionRef;
use App\Domains\Duas\Models\DuaGroup;
use App\Domains\Duas\Models\DuaHadith;
use App\Domains\Duas\Models\DuaItem;
use App\Domains\Duas\Models\DuaLink;
use App\Domains\Duas\Models\DuaQuranSpan;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\Query\JoinClause;
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
            'recitation_timings' => $this->recitationTimingsSource($resourceId),
            'azkar_chapters' => AzkarChapter::query()->toBase()
                ->where('azkar_chapters.resource_id', $resourceId),
            'azkar_entries' => AzkarEntry::query()->toBase()
                ->where('azkar_entries.resource_id', $resourceId),
            'azkar_items' => AzkarItem::query()->toBase()
                ->where('azkar_items.resource_id', $resourceId),
            'azkar_segments' => AzkarSegment::query()->toBase()
                ->where('azkar_segments.resource_id', $resourceId),
            'azkar_categories' => AzkarCategory::query()->toBase()
                ->where('azkar_categories.resource_id', $resourceId),
            'azkar_entry_categories' => AzkarEntryCategory::query()->toBase()
                ->where('azkar_entry_categories.resource_id', $resourceId),
            'azkar_notes' => AzkarNote::query()->toBase()
                ->where('azkar_notes.resource_id', $resourceId),
            'azkar_recordings' => AzkarRecording::query()->toBase()
                ->where('azkar_recordings.resource_id', $resourceId),
            'dua_items' => DuaItem::query()->toBase()
                ->where('dua_items.resource_id', $resourceId),
            'dua_quran_spans' => DuaQuranSpan::query()->toBase()
                ->where('dua_quran_spans.resource_id', $resourceId),
            'dua_hadith' => DuaHadith::query()->toBase()
                ->where('dua_hadith.resource_id', $resourceId),
            'dua_groups' => DuaGroup::query()->toBase()
                ->where('dua_groups.resource_id', $resourceId),
            'dua_links' => DuaLink::query()->toBase()
                ->where('dua_links.resource_id', $resourceId)
                ->where('dua_links.review_status', 'reviewed'),
            'dua_collection_refs' => DuaCollectionRef::query()->toBase()
                ->where('dua_collection_refs.resource_id', $resourceId)
                ->where('dua_collection_refs.review_status', 'reviewed'),
            'dua_collection_books' => DuaCollectionBook::query()->toBase()
                ->where('dua_collection_books.resource_id', $resourceId),
            'names_lists' => NamesList::query()->toBase()
                ->where('names_lists.resource_id', $resourceId),
            'names' => Name::query()->toBase()
                ->where('names.resource_id', $resourceId),
            'names_verses' => NamesVerse::query()->toBase()
                ->where('names_verses.resource_id', $resourceId),
            'names_notes' => NamesNote::query()->toBase()
                ->where('names_notes.resource_id', $resourceId),
            default => throw new PackBuildException('Unknown pack table ['.$table->name.'].'),
        };

        foreach ($table->orderBy as $column) {
            $query->orderBy($table->name.'.'.$column);
        }

        return $query->select($this->selectList($table));
    }

    /**
     * The recitation_timings rows of one resource, as a derived table named recitation_timings (ADR 0060). A surah file
     * takes its Taybah rows when a Taybah set matches its recitation, surah and current audio URL, and its own QF or
     * MP3Quran rows otherwise, so a file appears from exactly one source.
     */
    private function recitationTimingsSource(int $resourceId): Builder
    {
        $own = RecitationTiming::query()->toBase()
            ->join('chapter_audio_files', 'chapter_audio_files.id', '=', 'recitation_timings.audio_file_id')
            ->join('recitations', 'recitations.id', '=', 'chapter_audio_files.recitation_id')
            ->where('recitations.resource_id', $resourceId)
            ->whereNotExists(function (Builder $set): void {
                $set->selectRaw('1')
                    ->from('taybah_timing_sets')
                    ->whereColumn('taybah_timing_sets.recitation_id', 'chapter_audio_files.recitation_id')
                    ->whereColumn('taybah_timing_sets.chapter_id', 'chapter_audio_files.chapter_id')
                    ->whereColumn('taybah_timing_sets.audio_url', 'chapter_audio_files.audio_url');
            })
            ->select([
                'recitation_timings.audio_file_id',
                'recitation_timings.verse_id',
                'recitation_timings.start_ms',
                'recitation_timings.end_ms',
                'recitation_timings.segments',
            ]);

        $taybah = TaybahRecitationTiming::query()->toBase()
            ->join('taybah_timing_sets', function (JoinClause $join): void {
                $join->on('taybah_timing_sets.recitation_id', '=', 'taybah_recitation_timings.recitation_id')
                    ->on('taybah_timing_sets.chapter_id', '=', 'taybah_recitation_timings.chapter_id');
            })
            ->join('chapter_audio_files', function (JoinClause $join): void {
                $join->on('chapter_audio_files.recitation_id', '=', 'taybah_timing_sets.recitation_id')
                    ->on('chapter_audio_files.chapter_id', '=', 'taybah_timing_sets.chapter_id')
                    ->on('chapter_audio_files.audio_url', '=', 'taybah_timing_sets.audio_url');
            })
            ->join('recitations', 'recitations.id', '=', 'chapter_audio_files.recitation_id')
            ->where('recitations.resource_id', $resourceId)
            ->select([
                'chapter_audio_files.id as audio_file_id',
                'taybah_recitation_timings.verse_id',
                'taybah_recitation_timings.start_ms',
                'taybah_recitation_timings.end_ms',
                'taybah_recitation_timings.segments',
            ]);

        return RecitationTiming::query()->toBase()->newQuery()
            ->fromSub($own->unionAll($taybah), 'recitation_timings');
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

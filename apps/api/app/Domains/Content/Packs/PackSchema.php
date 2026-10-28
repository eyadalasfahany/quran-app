<?php

declare(strict_types=1);

namespace App\Domains\Content\Packs;

use App\Domains\Content\Enums\ResourceGroup;

/**
 * Pack tables and columns from the phase-1 shared contract.
 */
final class PackSchema
{
    public const int VERSION = 1;

    public const int CHUNK = 1000;

    /**
     * @return list<PackTable>
     */
    public static function tablesFor(ResourceGroup $group): array
    {
        return match ($group) {
            ResourceGroup::Translations, ResourceGroup::WordByWordTranslations, ResourceGroup::WordByWordTransliterations => [],
            ResourceGroup::Tafsirs => [self::tafsirEntries()],
            ResourceGroup::Mushafs => [self::mushafs(), self::mushafPages(), self::wordLayouts()],
            ResourceGroup::ChapterRecitations => [self::recitations(), self::chapterAudioFiles(), self::recitationTimings()],
            default => throw new PackBuildException('Resource group ['.$group->value.'] has no pack schema.'),
        };
    }

    public static function tafsirEntries(): PackTable
    {
        return new PackTable(
            name: 'tafsir_entries',
            columns: [
                self::integer('resource_id'),
                self::integer('group_tafsir_id'),
                self::integer('first_verse_id'),
                self::integer('last_verse_id'),
                self::text('html'),
            ],
            primaryKey: ['resource_id', 'group_tafsir_id'],
            orderBy: ['group_tafsir_id'],
        );
    }

    public static function mushafs(): PackTable
    {
        return new PackTable(
            name: 'mushafs',
            columns: [
                self::integer('id'),
                self::integer('resource_id'),
                self::text('name'),
                self::integer('pages_count'),
                self::integer('lines_per_page'),
                self::text('default_font_name', nullable: true),
            ],
            primaryKey: ['id'],
            orderBy: ['id'],
        );
    }

    public static function mushafPages(): PackTable
    {
        return new PackTable(
            name: 'mushaf_pages',
            columns: [
                self::integer('mushaf_id'),
                self::integer('page_number'),
                self::integer('first_verse_id'),
                self::integer('last_verse_id'),
                self::integer('first_word_id'),
                self::integer('last_word_id'),
                self::text('verse_mapping'),
            ],
            primaryKey: ['mushaf_id', 'page_number'],
            orderBy: ['mushaf_id', 'page_number'],
        );
    }

    public static function wordLayouts(): PackTable
    {
        return new PackTable(
            name: 'word_layouts',
            columns: [
                self::integer('mushaf_id'),
                self::integer('word_id'),
                self::integer('verse_id'),
                self::integer('position_in_verse'),
                self::text('char_type'),
                self::text('glyph'),
                self::integer('page'),
                self::integer('line'),
                self::integer('position_in_line'),
            ],
            primaryKey: ['mushaf_id', 'word_id'],
            orderBy: ['mushaf_id', 'word_id'],
        );
    }

    public static function recitations(): PackTable
    {
        return new PackTable(
            name: 'recitations',
            columns: [
                self::integer('id'),
                self::integer('resource_id'),
                self::text('reciter_name', nullable: true),
                self::text('reciter_name_ar', nullable: true),
                self::text('style', nullable: true),
                self::text('qirat', nullable: true),
                self::integer('has_word_segments'),
            ],
            primaryKey: ['id'],
            orderBy: ['id'],
        );
    }

    public static function chapterAudioFiles(): PackTable
    {
        return new PackTable(
            name: 'chapter_audio_files',
            columns: [
                self::integer('id'),
                self::integer('recitation_id'),
                self::integer('chapter_id'),
                self::text('audio_url'),
                self::integer('size_bytes', nullable: true),
                self::integer('duration_ms'),
                self::text('format'),
            ],
            primaryKey: ['id'],
            orderBy: ['id'],
        );
    }

    public static function recitationTimings(): PackTable
    {
        return new PackTable(
            name: 'recitation_timings',
            columns: [
                self::integer('audio_file_id'),
                self::integer('verse_id'),
                self::integer('start_ms'),
                self::integer('end_ms'),
                self::text('segments', nullable: true),
            ],
            primaryKey: ['audio_file_id', 'verse_id'],
            orderBy: ['audio_file_id', 'verse_id'],
        );
    }

    private static function integer(string $name, bool $nullable = false): PackColumn
    {
        return new PackColumn($name, integer: true, nullable: $nullable);
    }

    private static function text(string $name, bool $nullable = false): PackColumn
    {
        return new PackColumn($name, integer: false, nullable: $nullable);
    }
}

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
            ResourceGroup::Azkar => [
                self::azkarChapters(),
                self::azkarEntries(),
                self::azkarItems(),
                self::azkarSegments(),
                self::azkarCategories(),
                self::azkarEntryCategories(),
                self::azkarNotes(),
                self::azkarRecordings(),
            ],
            ResourceGroup::Duas => [
                self::duaItems(),
                self::duaQuranSpans(),
                self::duaHadith(),
                self::duaGroups(),
                self::duaLinks(),
                self::duaCollectionRefs(),
                self::duaCollectionBooks(),
            ],
            ResourceGroup::Names => [
                self::namesLists(),
                self::names(),
                self::namesVerses(),
                self::namesNotes(),
            ],
            ResourceGroup::HadithCollections => [
                self::hadithCollections(),
                self::hadithBooks(),
                self::hadithChapters(),
                self::hadithEntries(),
                self::hadithGrades(),
                self::hadithRefAliases(),
            ],
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
                self::integer('first_ayah', nullable: true),
                self::integer('last_ayah', nullable: true),
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

    public static function azkarChapters(): PackTable
    {
        return new PackTable(
            name: 'azkar_chapters',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::text('source_chapter_id'),
                self::integer('number'),
                self::text('title_ar', nullable: true),
                self::text('title_en', nullable: true),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function azkarEntries(): PackTable
    {
        return new PackTable(
            name: 'azkar_entries',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::text('entry_key'),
                self::integer('chapter_id'),
                self::integer('position'),
                self::text('source_reference'),
                self::text('entry_type'),
                self::text('occasion', nullable: true),
                self::text('timing_type', nullable: true),
                self::text('timing_prayer', nullable: true),
                self::text('timing_policy_id', nullable: true),
                self::text('review_status'),
                self::text('source_version'),
                self::integer('imported_at'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function azkarItems(): PackTable
    {
        return new PackTable(
            name: 'azkar_items',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::integer('entry_id'),
                self::text('item_key'),
                self::text('variation_key'),
                self::integer('position'),
                self::text('kind'),
                self::integer('required_count', nullable: true),
                self::text('speaker', nullable: true),
                self::text('source_dua_id', nullable: true),
                self::text('text_en', nullable: true),
                self::text('transliteration', nullable: true),
                self::text('source_text_sha256', nullable: true),
                self::integer('repeat_group', nullable: true),
                self::integer('repeat_times', nullable: true),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function azkarSegments(): PackTable
    {
        return new PackTable(
            name: 'azkar_segments',
            columns: [
                self::integer('resource_id'),
                self::integer('item_id'),
                self::integer('position'),
                self::text('kind'),
                self::text('text_ar', nullable: true),
                self::integer('quran_surah', nullable: true),
                self::integer('quran_verse_from', nullable: true),
                self::integer('quran_verse_to', nullable: true),
                self::text('text_search', nullable: true),
            ],
            primaryKey: ['resource_id', 'item_id', 'position'],
            orderBy: ['resource_id', 'item_id', 'position'],
        );
    }

    public static function azkarCategories(): PackTable
    {
        return new PackTable(
            name: 'azkar_categories',
            columns: [
                self::integer('resource_id'),
                self::text('id'),
                self::text('kind'),
                self::integer('position'),
                self::text('occasion', nullable: true),
                self::text('progress_period'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function azkarEntryCategories(): PackTable
    {
        return new PackTable(
            name: 'azkar_entry_categories',
            columns: [
                self::integer('resource_id'),
                self::text('category_id'),
                self::integer('entry_id'),
                self::text('variation_key'),
                self::integer('position'),
            ],
            primaryKey: ['resource_id', 'category_id', 'entry_id', 'variation_key'],
            orderBy: ['resource_id', 'category_id', 'entry_id', 'variation_key'],
        );
    }

    public static function azkarNotes(): PackTable
    {
        return new PackTable(
            name: 'azkar_notes',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::integer('entry_id'),
                self::integer('item_id', nullable: true),
                self::text('kind'),
                self::text('text_ar', nullable: true),
                self::text('text_en', nullable: true),
                self::text('grader', nullable: true),
                self::text('source_type'),
                self::text('source_name'),
                self::text('source_reference', nullable: true),
                self::text('source_url', nullable: true),
                self::text('review_status'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function namesLists(): PackTable
    {
        return new PackTable(
            name: 'names_lists',
            columns: [
                self::integer('resource_id'),
                self::text('list_slug'),
                self::text('title_ar'),
                self::text('source_label_ar'),
                self::text('attribution_ar', nullable: true),
                self::text('attribution_en', nullable: true),
                self::text('edition_reference', nullable: true),
                self::text('source_version'),
            ],
            primaryKey: ['resource_id', 'list_slug'],
            orderBy: ['resource_id', 'list_slug'],
        );
    }

    public static function names(): PackTable
    {
        return new PackTable(
            name: 'names',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::text('name_slug'),
                self::integer('position'),
                self::text('name_ar'),
                self::text('text_search'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function namesVerses(): PackTable
    {
        return new PackTable(
            name: 'names_verses',
            columns: [
                self::integer('resource_id'),
                self::text('name_slug'),
                self::text('verse_key'),
                self::text('review_status'),
                self::text('evidence', nullable: true),
            ],
            primaryKey: ['resource_id', 'name_slug', 'verse_key'],
            orderBy: ['resource_id', 'name_slug', 'verse_key'],
        );
    }

    public static function namesNotes(): PackTable
    {
        return new PackTable(
            name: 'names_notes',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::text('name_slug'),
                self::text('kind'),
                self::text('text_ar', nullable: true),
                self::text('source_type'),
                self::text('source_name'),
                self::text('source_reference', nullable: true),
                self::text('source_url', nullable: true),
                self::text('review_status'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function azkarRecordings(): PackTable
    {
        return new PackTable(
            name: 'azkar_recordings',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::text('recording_key'),
                self::integer('item_id'),
                self::text('reciter_name'),
                self::text('reciter_name_ar', nullable: true),
                self::text('source'),
                self::text('remote_url'),
                self::integer('duration_ms'),
                self::integer('size_bytes', nullable: true),
                self::integer('stream_allowed'),
                self::integer('download_allowed'),
                self::integer('redistribution_allowed'),
                self::text('attribution_ar', nullable: true),
                self::text('attribution_en', nullable: true),
                self::text('licence'),
                self::text('licence_url', nullable: true),
                self::integer('rights_verified_at', nullable: true),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function duaItems(): PackTable
    {
        return new PackTable(
            name: 'dua_items',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::text('dua_key'),
                self::text('kind'),
                self::integer('group_id', nullable: true),
                self::integer('position'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function duaQuranSpans(): PackTable
    {
        return new PackTable(
            name: 'dua_quran_spans',
            columns: [
                self::integer('resource_id'),
                self::integer('item_id'),
                self::integer('surah'),
                self::integer('verse_from'),
                self::integer('verse_to', nullable: true),
            ],
            primaryKey: ['resource_id', 'item_id'],
            orderBy: ['resource_id', 'item_id'],
        );
    }

    public static function duaHadith(): PackTable
    {
        return new PackTable(
            name: 'dua_hadith',
            columns: [
                self::integer('resource_id'),
                self::integer('item_id'),
                self::integer('hadeeth_id'),
                self::text('title'),
                self::text('hadeeth'),
                self::text('attribution'),
                self::text('grade', nullable: true),
                self::text('explanation', nullable: true),
                self::text('reference', nullable: true),
                self::text('hints', nullable: true),
                self::text('text_search'),
                self::text('source_url'),
            ],
            primaryKey: ['resource_id', 'item_id'],
            orderBy: ['resource_id', 'item_id'],
        );
    }

    public static function duaGroups(): PackTable
    {
        return new PackTable(
            name: 'dua_groups',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::integer('source_category_id'),
                self::text('title'),
                self::integer('position'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function duaLinks(): PackTable
    {
        return new PackTable(
            name: 'dua_links',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::integer('item_id'),
                self::integer('hadeeth_id'),
                self::text('entry_key'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function duaCollectionRefs(): PackTable
    {
        return new PackTable(
            name: 'dua_collection_refs',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::integer('item_id'),
                self::text('collection_slug'),
                self::text('hadith_number'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function duaCollectionBooks(): PackTable
    {
        return new PackTable(
            name: 'dua_collection_books',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::text('collection_slug'),
                self::text('book_number'),
                self::integer('position'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function hadithCollections(): PackTable
    {
        return new PackTable(
            name: 'hadith_collections',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::text('slug'),
                self::text('source_code'),
                self::text('title_ar', nullable: true),
                self::text('title_en', nullable: true),
                self::text('author_ar', nullable: true),
                self::text('author_en', nullable: true),
                self::text('attribution_ar'),
                self::text('attribution_en'),
                self::text('source_url', nullable: true),
                self::integer('total_hadith'),
                self::integer('books_count'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function hadithBooks(): PackTable
    {
        return new PackTable(
            name: 'hadith_books',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::text('book_number'),
                self::text('title_ar', nullable: true),
                self::text('title_en', nullable: true),
                self::integer('position'),
                self::integer('hadith_count'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function hadithChapters(): PackTable
    {
        return new PackTable(
            name: 'hadith_chapters',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::integer('book_id'),
                self::integer('chapter_number'),
                self::text('source_chapter_key', nullable: true),
                self::text('title_ar', nullable: true),
                self::text('title_en', nullable: true),
                self::integer('position'),
                self::integer('hadith_count'),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function hadithEntries(): PackTable
    {
        return new PackTable(
            name: 'hadith_entries',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::integer('book_id'),
                self::integer('chapter_id', nullable: true),
                self::text('hadith_number'),
                self::text('arabic_number', nullable: true),
                self::integer('position'),
                self::text('text_ar'),
                self::text('text_en', nullable: true),
                self::text('narrator_en', nullable: true),
                self::text('text_search'),
                self::text('source_url', nullable: true),
                self::text('number_first', nullable: true),
                self::text('number_last', nullable: true),
                self::text('source_code', nullable: true),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function hadithGrades(): PackTable
    {
        return new PackTable(
            name: 'hadith_grades',
            columns: [
                self::integer('resource_id'),
                self::integer('id'),
                self::integer('entry_id'),
                self::text('grade'),
                self::text('graded_by', nullable: true),
            ],
            primaryKey: ['resource_id', 'id'],
            orderBy: ['resource_id', 'id'],
        );
    }

    public static function hadithRefAliases(): PackTable
    {
        return new PackTable(
            name: 'hadith_ref_aliases',
            columns: [
                self::integer('resource_id'),
                self::text('old_number'),
                self::text('new_number', nullable: true),
                self::text('match'),
                self::integer('since_version'),
            ],
            primaryKey: ['resource_id', 'old_number', 'since_version'],
            orderBy: ['resource_id', 'old_number', 'since_version'],
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

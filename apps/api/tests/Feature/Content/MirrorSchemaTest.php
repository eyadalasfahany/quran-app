<?php

declare(strict_types=1);

use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Mushaf;
use App\Domains\Content\Models\MushafPage;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\RecitationTiming;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\TafsirEntry;
use App\Domains\Content\Models\WordLayout;
use Database\Seeders\ContentSourceSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('creates the content mirror tables and seeds two sources idempotently alongside the pending opendua row', function (): void {
    $tables = [
        'content_sources',
        'resources',
        'sync_states',
        'sync_runs',
        'content_changes',
        'content_packs',
        'tafsir_entries',
        'mushafs',
        'mushaf_pages',
        'word_layouts',
        'recitations',
        'chapter_audio_files',
        'recitation_timings',
    ];

    foreach ($tables as $table) {
        expect(Schema::hasTable($table))->toBeTrue();
    }

    expect(Schema::hasTable('translation_entries'))->toBeFalse();

    $this->seed(ContentSourceSeeder::class);
    $this->seed(ContentSourceSeeder::class);

    // The azkar migration adds the pending opendua row (ADR 0031); the names migration adds the pending
    // names-tirmidhi row (ADR 0043 A2); the MP3Quran migration adds the mp3quran row (ADR 0061); the seeder adds qf and tanzil.
    expect(ContentSource::query()->count())->toBe(7)
        ->and(ContentSource::query()->orderBy('code')->pluck('code')->all())->toBe(['hadeethenc', 'hisnmuslim', 'mp3quran', 'names-tirmidhi', 'opendua', 'qf', 'tanzil']);
});

it('stores quran text in the binary collation and no other text column', function (): void {
    /** @var list<object{TABLE_NAME: string, COLUMN_NAME: string}> $columns */
    $columns = DB::select(
        'select TABLE_NAME, COLUMN_NAME from information_schema.COLUMNS where TABLE_SCHEMA = database() and COLLATION_NAME = ?',
        ['utf8mb4_0900_bin'],
    );

    $binary = collect($columns)
        ->map(fn (object $column): string => $column->TABLE_NAME.'.'.$column->COLUMN_NAME)
        ->sort()
        ->values()
        ->all();

    expect($binary)->toBe([
        'dua_groups.title',
        'dua_hadith.attribution',
        'dua_hadith.explanation',
        'dua_hadith.grade',
        'dua_hadith.hadeeth',
        'dua_hadith.reference',
        'dua_hadith.title',
        // Names of Allah are source text stored byte-for-byte (ADR 0043 A2), like the dua source columns.
        'names.name_ar',
        'tafsir_entries.html',
        'word_layouts.glyph',
    ]);
});

it('round-trips quran text byte for byte', function (): void {
    $sample = "\u{0671}\u{0644}\u{0631}\u{064E}\u{0651}\u{062D}\u{0652}\u{0645}\u{064E}\u{0640}\u{0670}\u{0646}\u{0650} \u{06DE} \u{200F}\u{FC41}  end ";
    $resource = Resource::factory()->create();
    $mushaf = Mushaf::factory()->create(['resource_id' => $resource->id]);

    TafsirEntry::factory()->create([
        'resource_id' => $resource->id,
        'html' => $sample,
    ]);
    WordLayout::factory()->create([
        'mushaf_id' => $mushaf->id,
        'glyph' => $sample,
    ]);

    $stored = [
        TafsirEntry::query()->where('resource_id', $resource->id)->value('html'),
        WordLayout::query()->where('mushaf_id', $mushaf->id)->value('glyph'),
    ];

    foreach ($stored as $value) {
        expect(is_string($value))->toBeTrue()
            ->and(bin2hex($value))->toBe(bin2hex($sample));
    }
});

it('rejects a duplicate resource identity', function (): void {
    $resource = Resource::factory()->create();

    expect(fn () => Resource::factory()->create([
        'source_id' => $resource->source_id,
        'group' => $resource->group,
        'source_key' => $resource->source_key,
    ]))->toThrow(QueryException::class);
});

it('rejects a duplicate tafsir group within a resource', function (): void {
    $entry = TafsirEntry::factory()->create();

    expect(fn () => TafsirEntry::factory()->create([
        'resource_id' => $entry->resource_id,
        'group_tafsir_id' => $entry->group_tafsir_id,
    ]))->toThrow(QueryException::class);
});

it('removes mirrored rows when their resource is deleted', function (): void {
    $resource = Resource::factory()->create();
    TafsirEntry::factory()->create(['resource_id' => $resource->id]);
    $mushaf = Mushaf::factory()->create(['resource_id' => $resource->id]);
    MushafPage::query()->create([
        'mushaf_id' => $mushaf->id,
        'page_number' => 1,
        'first_verse_id' => 1,
        'last_verse_id' => 7,
        'first_word_id' => 1,
        'last_word_id' => 20,
        'verses_count' => 7,
        'verse_mapping' => ['1' => '1-7'],
    ]);
    WordLayout::factory()->create(['mushaf_id' => $mushaf->id]);
    $recitation = Recitation::factory()->create(['resource_id' => $resource->id]);
    $audio = ChapterAudioFile::factory()->create(['recitation_id' => $recitation->id]);
    RecitationTiming::query()->create([
        'audio_file_id' => $audio->id,
        'verse_id' => 1,
        'verse_key' => '1:1',
        'start_ms' => 0,
        'end_ms' => 1500,
        'segments' => null,
    ]);

    $resource->delete();

    expect(TafsirEntry::query()->count())->toBe(0)
        ->and(Mushaf::query()->count())->toBe(0)
        ->and(MushafPage::query()->count())->toBe(0)
        ->and(WordLayout::query()->count())->toBe(0)
        ->and(Recitation::query()->count())->toBe(0)
        ->and(ChapterAudioFile::query()->count())->toBe(0)
        ->and(RecitationTiming::query()->count())->toBe(0);
});

it('rejects a recitation timing that does not start before it ends', function (int $start, int $end): void {
    $audio = ChapterAudioFile::factory()->create();

    expect(fn () => RecitationTiming::query()->create([
        'audio_file_id' => $audio->id,
        'verse_id' => 1,
        'verse_key' => '1:1',
        'start_ms' => $start,
        'end_ms' => $end,
    ]))->toThrow(QueryException::class);
})->with([
    'equal bounds' => [10, 10],
    'reversed bounds' => [11, 10],
]);

<?php

declare(strict_types=1);

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\TaybahRecitationTiming;
use App\Domains\Content\Models\TaybahTimingSet;
use App\Domains\Content\Repositories\Contracts\RecitationTimingRepository;
use App\Domains\Content\Services\RecitationSegmentsFlagService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * A recitation with one chapter audio file (chapter 1) at $audioUrl.
 */
function segmentFlagRecitation(string $audioUrl = 'https://audio.example.test/flag/001.mp3'): array
{
    $source = ContentSource::query()->create([
        'code' => 'flagsrc',
        'name' => 'Flag source',
        'licence_url' => 'https://example.test/licence',
        'attribution_ar' => 'إسناد',
        'attribution_en' => 'Attribution',
        'permission_status' => PermissionStatus::Granted,
    ]);
    $resource = Resource::factory()->create([
        'source_id' => $source->id,
        'group' => ResourceGroup::ChapterRecitations,
        'source_key' => '1',
    ]);
    $recitation = Recitation::factory()->create([
        'resource_id' => $resource->id,
        'has_word_segments' => true,
    ]);
    $file = ChapterAudioFile::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'audio_url' => $audioUrl,
    ]);

    return ['recitation' => $recitation, 'file' => $file];
}

function segmentFlagTaybahSet(Recitation $recitation, string $audioUrl, ?array $segments): void
{
    TaybahTimingSet::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'audio_url' => $audioUrl,
    ]);

    TaybahRecitationTiming::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'verse_id' => 1,
        'start_ms' => 0,
        'end_ms' => 1000,
        'segments' => $segments,
    ]);
}

function segmentFlag(int $recitationId): bool
{
    return (bool) Recitation::query()->whereKey($recitationId)->value('has_word_segments');
}

it('sets the flag from QF rows with segments', function (): void {
    ['recitation' => $recitation, 'file' => $file] = segmentFlagRecitation();
    app(RecitationTimingRepository::class)->insert([[
        'audio_file_id' => $file->id,
        'verse_id' => 1,
        'verse_key' => '1:1',
        'start_ms' => 0,
        'end_ms' => 1000,
        'segments' => [[1, 0, 1000]],
    ]]);

    app(RecitationSegmentsFlagService::class)->refresh($recitation->id);

    expect(segmentFlag($recitation->id))->toBeTrue();
});

it('sets the flag from a served Taybah set only', function (): void {
    ['recitation' => $recitation] = segmentFlagRecitation();
    segmentFlagTaybahSet($recitation, 'https://audio.example.test/flag/001.mp3', [[1, 0, 1000]]);

    app(RecitationSegmentsFlagService::class)->refresh($recitation->id);

    expect(segmentFlag($recitation->id))->toBeTrue();
});

it('clears the flag when the Taybah set URL no longer matches the file', function (): void {
    ['recitation' => $recitation] = segmentFlagRecitation();
    segmentFlagTaybahSet($recitation, 'https://audio.example.test/flag/old.mp3', [[1, 0, 1000]]);

    app(RecitationSegmentsFlagService::class)->refresh($recitation->id);

    expect(segmentFlag($recitation->id))->toBeFalse();
});

it('clears the flag when neither source has segments', function (): void {
    ['recitation' => $recitation] = segmentFlagRecitation();
    segmentFlagTaybahSet($recitation, 'https://audio.example.test/flag/001.mp3', null);

    app(RecitationSegmentsFlagService::class)->refresh($recitation->id);

    expect(segmentFlag($recitation->id))->toBeFalse();
});

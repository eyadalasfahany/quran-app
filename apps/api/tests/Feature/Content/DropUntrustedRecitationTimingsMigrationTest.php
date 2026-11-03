<?php

declare(strict_types=1);

use App\Domains\Content\Events\ResourceContentChanged;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\RecitationTiming;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

function recitationWithTiming(string $sourceKey): Recitation
{
    $recitation = Recitation::factory()->create(['has_word_segments' => true]);
    $recitation->resource->forceFill(['source_key' => $sourceKey, 'version' => 4, 'changes_floor_version' => 1])->save();
    $file = ChapterAudioFile::factory()->create(['recitation_id' => $recitation->id, 'chapter_id' => 1]);
    RecitationTiming::query()->create([
        'audio_file_id' => $file->id,
        'verse_id' => 1,
        'verse_key' => '1:1',
        'start_ms' => 0,
        'end_ms' => 500,
        'segments' => [[1, 0, 500]],
    ]);

    return $recitation;
}

function runDropUntrustedTimings(): void
{
    $migration = require glob(database_path('migrations/*_drop_untrusted_recitation_timings.php'))[0];
    $migration->up();
}

it('drops the timings of untrusted reciters, moves their version and floor, and queues their pack, leaving others', function (): void {
    Event::fake([ResourceContentChanged::class]);
    config(['quran.untrusted_timing_recitations' => [158]]);
    $untrusted = recitationWithTiming('158');
    $trusted = recitationWithTiming('7');

    runDropUntrustedTimings();

    $resource = $untrusted->resource->fresh();
    expect(RecitationTiming::query()->whereIn('audio_file_id', ChapterAudioFile::query()->where('recitation_id', $untrusted->id)->pluck('id'))->count())->toBe(0)
        ->and(RecitationTiming::query()->whereIn('audio_file_id', ChapterAudioFile::query()->where('recitation_id', $trusted->id)->pluck('id'))->count())->toBe(1)
        ->and($untrusted->fresh()->has_word_segments)->toBeFalse()
        ->and($resource->version)->toBe(5)
        ->and($resource->changes_floor_version)->toBe(5)
        ->and($trusted->resource->fresh()->version)->toBe(4);
    Event::assertDispatched(ResourceContentChanged::class, fn (ResourceContentChanged $event): bool => $event->resourceId === $resource->id && $event->version === 5);
    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

it('changes nothing when run again', function (): void {
    Event::fake([ResourceContentChanged::class]);
    config(['quran.untrusted_timing_recitations' => [158]]);
    $untrusted = recitationWithTiming('158');

    runDropUntrustedTimings();
    runDropUntrustedTimings();

    expect($untrusted->resource->fresh()->version)->toBe(5);
    Event::assertDispatchedTimes(ResourceContentChanged::class, 1);
});

<?php

declare(strict_types=1);

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ChapterAudioFile;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Recitation;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Models\TaybahTimingSet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;

uses(RefreshDatabase::class);

function verifyRecitationWithAudio(string $currentUrl): Recitation
{
    $source = ContentSource::query()->create([
        'code' => 'verifysrc',
        'name' => 'Verify source',
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
    $recitation = Recitation::factory()->create(['resource_id' => $resource->id]);

    ChapterAudioFile::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'audio_url' => $currentUrl,
    ]);

    return $recitation;
}

it('lists a stale set and exits non-zero', function (): void {
    $recitation = verifyRecitationWithAudio('https://audio.example.test/verify/current.mp3');
    TaybahTimingSet::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'audio_url' => 'https://audio.example.test/verify/stale.mp3',
    ]);

    $code = Artisan::call('recitation-timings:verify');
    $output = Artisan::output();

    expect($code)->toBe(1)
        ->and($output)->toContain((string) $recitation->id)
        ->and($output)->toContain('https://audio.example.test/verify/stale.mp3');
});

it('exits zero when no set is stale', function (): void {
    $recitation = verifyRecitationWithAudio('https://audio.example.test/verify/current.mp3');
    TaybahTimingSet::factory()->create([
        'recitation_id' => $recitation->id,
        'chapter_id' => 1,
        'audio_url' => 'https://audio.example.test/verify/current.mp3',
    ]);

    expect(Artisan::call('recitation-timings:verify'))->toBe(0);
});

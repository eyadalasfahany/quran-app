<?php

declare(strict_types=1);

use App\Domains\Content\Models\ContentSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function openitiAttributionMigration(): object
{
    return require glob(database_path('migrations/*_update_openiti_attribution.php'))[0];
}

function openitiSourceMigration(): object
{
    return require glob(database_path('migrations/*_insert_openiti_and_hadithapicom_content_sources.php'))[0];
}

it('names book titles in the openiti credit after migrate', function (): void {
    $source = ContentSource::query()->where('code', 'openiti')->sole();

    expect($source->attribution_ar)->toBe('عناوين الكتب والأبواب وبعض نصوص الأحاديث: مشروع OpenITI (الإصدار 2023.1.8)، بترخيص CC BY-NC-SA 4.0')
        ->and($source->attribution_en)->toBe('Book and chapter titles and some hadith texts: OpenITI (release 2023.1.8), CC BY-NC-SA 4.0');
});

it('restores the 110001 wording on down() and sets the new wording again on up()', function (): void {
    openitiSourceMigration()->up();
    $previous = DB::table('content_sources')->where('code', 'openiti')->first();

    openitiAttributionMigration()->up();
    $updated = DB::table('content_sources')->where('code', 'openiti')->first();

    openitiAttributionMigration()->down();
    $restored = DB::table('content_sources')->where('code', 'openiti')->first();

    expect($updated->attribution_ar)->not->toBe($previous->attribution_ar)
        ->and($updated->attribution_en)->not->toBe($previous->attribution_en)
        ->and($restored->attribution_ar)->toBe($previous->attribution_ar)
        ->and($restored->attribution_en)->toBe($previous->attribution_en);

    openitiAttributionMigration()->up();

    expect(DB::table('content_sources')->where('code', 'openiti')->value('attribution_en'))
        ->toBe('Book and chapter titles and some hadith texts: OpenITI (release 2023.1.8), CC BY-NC-SA 4.0');
});

it('leaves the rest of the openiti row alone', function (): void {
    $before = DB::table('content_sources')->where('code', 'openiti')->first();

    openitiAttributionMigration()->up();

    $after = DB::table('content_sources')->where('code', 'openiti')->first();

    expect($after->name)->toBe($before->name)
        ->and($after->permission_status)->toBe($before->permission_status)
        ->and($after->notes)->toBe($before->notes)
        ->and($after->created_at)->toBe($before->created_at);
});

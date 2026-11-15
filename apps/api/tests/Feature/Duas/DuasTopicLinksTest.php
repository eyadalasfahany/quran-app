<?php

declare(strict_types=1);

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use App\Domains\Content\Packs\PackBuilder;
use App\Domains\Duas\Models\DuaTopicLink;
use App\Domains\Duas\Services\DuasImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Bus::fake();
    Storage::fake('local');
    ContentSource::query()->where('code', 'hadeethenc')->update(['permission_status' => PermissionStatus::Granted->value]);
    config([
        'duas.hadeethenc.snapshot_date' => '',
        'duas.hadeethenc.snapshot_sha256' => '',
        'duas.collection_books' => [],
        'duas.hadeethenc.hidden_category_ids' => [],
        'duas.hadeethenc.excluded_hadith_ids' => [],
        'duas.hadeethenc.duplicate_of_hisn' => [],
        'azkar_topics.topics' => ['topic-alpha' => ['ar' => 'ألف', 'en' => 'Alpha'], 'topic-beta' => ['ar' => 'باء', 'en' => 'Beta']],
        'duas_quran_map' => [
            'quran:1:1' => [[1, 1, null, 'status' => 'reviewed', 'rule' => 'rule_test']],
            'quran:1:2' => [[1, 2, null, 'status' => 'candidate', 'rule' => 'rule_test']],
            'quran:1:3' => [[1, 3, null, 'status' => 'rejected', 'rule' => 'rule_test']],
        ],
        'duas_topics' => duasTopicConfigFixture(),
    ]);
    app()->detectEnvironment(fn (): string => 'local');
});

afterEach(function (): void {
    Cache::lock('duas:import')->forceRelease();
});

/** @return array<string, array<string, array<string, string>>> */
function duasTopicConfigFixture(): array
{
    return [
        'quran' => [
            'quran:1:1' => ['topic' => 'topic-alpha', 'status' => 'reviewed', 'evidence' => 'developer:test'],
            'quran:1:2' => ['topic' => 'topic-alpha', 'status' => 'reviewed', 'evidence' => 'developer:test'],
            'quran:1:3' => ['topic' => 'topic-alpha', 'status' => 'reviewed', 'evidence' => 'developer:test'],
            'quran:9:9' => ['topic' => 'topic-alpha', 'status' => 'reviewed', 'evidence' => 'developer:test'],
        ],
        'hadith_chapters' => [
            'hadithchapter:bukhari:80:1' => ['topic' => 'topic-beta', 'status' => 'reviewed', 'evidence' => 'developer:test'],
            'hadithchapter:bukhari:80:2' => ['topic' => 'topic-beta', 'status' => 'candidate', 'evidence' => 'claude:test'],
        ],
    ];
}

function runDuasTopicImport(): ImportReport
{
    return app(DuasImporter::class)->run(dryRun: false, deferPack: true);
}

it('writes reviewed quran and hadith chapter rows and ignores the candidate row', function (): void {
    runDuasTopicImport();

    $links = DuaTopicLink::query()->orderBy('position')->get()->map(fn (DuaTopicLink $link): array => [
        $link->topic_id, $link->target_kind, $link->target_key,
    ])->all();

    // quran:1:2 is a candidate span: accepted outside production with a warning, so its reviewed topic row is written.
    expect($links)->toBe([
        ['topic-alpha', 'quran', 'quran:1:1'],
        ['topic-alpha', 'quran', 'quran:1:2'],
        ['topic-beta', 'hadith_chapter', 'hadithchapter:bukhari:80:1'],
    ]);
});

it('skips a quran key that is rejected or absent in the map, with no issue', function (): void {
    $report = runDuasTopicImport();

    expect(DuaTopicLink::query()->where('target_key', 'quran:1:3')->exists())->toBeFalse()
        ->and(DuaTopicLink::query()->where('target_key', 'quran:9:9')->exists())->toBeFalse()
        ->and($report->errors())->toBe([]);
});

it('keeps the fingerprint when the topic config is unchanged and moves it when it changes', function (): void {
    $first = runDuasTopicImport();
    $second = runDuasTopicImport();

    expect($first->status)->toBe(ImportReport::STATUS_IMPORTED)
        ->and($second->status)->toBe(ImportReport::STATUS_UNCHANGED);

    config(['duas_topics.hadith_chapters.hadithchapter:bukhari:80:1.topic' => 'topic-alpha']);
    $changed = runDuasTopicImport();

    expect($changed->status)->toBe(ImportReport::STATUS_IMPORTED);
});

it('packs the dua_topic_links table with the reviewed rows', function (): void {
    runDuasTopicImport();

    $resource = Resource::query()->where('group', ResourceGroup::Duas->value)->firstOrFail();
    $gzipped = Storage::disk('local')->get(app(PackBuilder::class)->build($resource)->path);
    $path = tempnam(sys_get_temp_dir(), 'duas-topic-pack-');
    file_put_contents((string) $path, (string) gzdecode((string) $gzipped));

    $pdo = new PDO('sqlite:'.$path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $keys = $pdo->query('SELECT target_key FROM dua_topic_links ORDER BY position')->fetchAll(PDO::FETCH_COLUMN);

    expect($keys)->toBe(['quran:1:1', 'quran:1:2', 'hadithchapter:bukhari:80:1']);
});

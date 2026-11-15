<?php

declare(strict_types=1);

use App\Domains\Azkar\Data\ImportReport;
use App\Domains\Azkar\Services\AzkarImporter;
use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Models\AzkarCategory;
use App\Domains\Content\Models\AzkarEntryCategory;
use App\Domains\Content\Models\ContentSource;
use App\Domains\Content\Models\Resource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/*
| ADR 0092 decisions 1-2 at import: one browse topic per reviewed chapter, through AzkarTransformer::categories(). The
| fixture has four entries: 1 (chapter 1, tag morning-and-evening, after-waking session), 2 (chapter 25, tag travel,
| after-prayer session), 3 (chapter 27, tag morning-and-evening, morning session), 4 (chapter 27, tag travel, evening
| session). Placeholder fixture only (ADR 0031 §9): no Azkar text is read here.
*/

uses(RefreshDatabase::class);

const TOPICS_FIXTURE_TOPICS = [
    'waking-topic' => ['ar' => 'FIXTURE topic waking', 'en' => 'FIXTURE topic waking'],
    'prayer' => ['ar' => 'FIXTURE topic prayer', 'en' => 'FIXTURE topic prayer'],
    'travel' => ['ar' => 'FIXTURE topic travel', 'en' => 'FIXTURE topic travel'],
];

beforeEach(function (): void {
    Bus::fake();
    ContentSource::query()->where('code', 'opendua')->update(['permission_status' => 'granted']);
    config([
        'azkar.opendua.catalogue_sha256' => hash_file('sha256', topicsFixture()),
        'azkar.hisnmuslim.snapshot_date' => '1900-01-01',
        'azkar.hadeethenc.snapshot_date' => '1900-01-01',
        'azkar.quran_references' => [
            'hisn-al-muslim:entry-000004:evening:1' => [[1, 1, 7, 'status' => 'reviewed', 'evidence' => 'fixture'], [2, 1, null, 'status' => 'reviewed', 'evidence' => 'fixture']],
        ],
        'azkar.split_topics' => [
            'morning-and-evening' => [
                'morning-topic' => ['session' => 'morning'],
                'evening-topic' => ['session' => 'evening'],
            ],
            'sleep-and-waking' => [
                'sleep-topic' => ['except_session' => 'after_waking'],
                'waking-topic' => ['session' => 'after_waking'],
            ],
        ],
        'azkar_entry_types.entries' => [],
        'azkar_topics.topics' => TOPICS_FIXTURE_TOPICS,
        'azkar_topics.chapters' => [],
    ]);
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/azkar-topics'));
});

function topicsFixture(): string
{
    return base_path('tests/Fixtures/azkar/opendua-fixture.json');
}

function topicsRun(): ImportReport
{
    return app(AzkarImporter::class)->run(topicsFixture(), false);
}

function topicsResource(): Resource
{
    return Resource::query()->where('group', ResourceGroup::Azkar->value)->firstOrFail();
}

/**
 * One row of the chapter config: a reviewed topic, a reviewed split, or a candidate or unknown row.
 *
 * @return array{topic?: string, split?: string, status: string, evidence: string}
 */
function topicsRow(string $topic, string $status = 'reviewed'): array
{
    return ['topic' => $topic, 'status' => $status, 'evidence' => 'fixture'];
}

/**
 * The browse categories in position order: id => entry ids with their variation keys, in link order.
 *
 * @return array<string, list<array{0: int, 1: string}>>
 */
function topicsBrowse(): array
{
    $ids = AzkarCategory::query()->where('kind', 'browse')->orderBy('position')->pluck('id')->all();
    $links = [];

    foreach ($ids as $id) {
        $links[$id] = AzkarEntryCategory::query()->where('category_id', $id)->orderBy('position')->get()
            ->map(fn (AzkarEntryCategory $row): array => [(int) $row->entry_id, (string) $row->variation_key])
            ->all();
    }

    return $links;
}

/**
 * The session categories, as the same id => links map.
 *
 * @return array<string, list<array{0: int, 1: string}>>
 */
function topicsSessions(): array
{
    $ids = AzkarCategory::query()->where('kind', 'session')->orderBy('position')->pluck('id')->all();
    $links = [];

    foreach ($ids as $id) {
        $links[$id] = AzkarEntryCategory::query()->where('category_id', $id)->orderBy('position')->get()
            ->map(fn (AzkarEntryCategory $row): array => [(int) $row->entry_id, (string) $row->variation_key])
            ->all();
    }

    return $links;
}

/**
 * The rows of one azkar table for the resource, sorted so two imports can be compared.
 *
 * @return array<int, array<string, mixed>>
 */
function topicsTableRows(string $table): array
{
    return DB::table($table)->where('resource_id', topicsResource()->id)->get()
        ->map(fn (object $row): array => (array) $row)
        ->sortBy(fn (array $row): string => json_encode($row, JSON_THROW_ON_ERROR))
        ->values()
        ->all();
}

it('with no rows the browse categories are the catalogue tags, and the topic config alone does not move the fingerprint', function (): void {
    topicsRun();
    $withTopicList = topicsResource()->import_fingerprint;

    expect(topicsBrowse())->toBe([
        'morning-topic' => [[3, 'morning']],
        'evening-topic' => [],
        'travel' => [[2, '*'], [4, '*']],
    ]);

    config(['azkar_topics.topics' => [], 'azkar_topics.chapters' => []]);
    $report = topicsRun();

    expect($report->status)->toBe(ImportReport::STATUS_UNCHANGED)
        ->and(topicsResource()->import_fingerprint)->toBe($withTopicList);
});

it('a reviewed row moves its chapter out of every catalogue tag into its one topic', function (): void {
    topicsRun();
    $before = topicsBrowse();

    config(['azkar_topics.chapters' => [25 => topicsRow('prayer')]]);
    topicsRun();

    expect(topicsBrowse())->toBe([
        'morning-topic' => [[3, 'morning']],
        'evening-topic' => [],
        'travel' => [[4, '*']],
        'prayer' => [[2, '*']],
    ])
        ->and($before['travel'])->toBe([[2, '*'], [4, '*']]);
});

it('a reviewed row changes the fingerprint, and removing it restores the fingerprint without rows', function (): void {
    topicsRun();
    $withoutRows = topicsResource()->import_fingerprint;

    config(['azkar_topics.chapters' => [25 => topicsRow('prayer')]]);
    topicsRun();
    expect(topicsResource()->import_fingerprint)->not->toBe($withoutRows);

    config(['azkar_topics.chapters' => []]);
    topicsRun();
    expect(topicsResource()->import_fingerprint)->toBe($withoutRows);
});

it('a candidate row changes no category or link, and is reported as not applied', function (): void {
    topicsRun();
    $baselineBrowse = topicsBrowse();
    $baselineItems = topicsTableRows('azkar_items');

    config(['azkar_topics.chapters' => [25 => topicsRow('prayer', 'candidate')]]);
    $report = topicsRun();

    expect(topicsBrowse())->toBe($baselineBrowse)
        ->and(topicsTableRows('azkar_items'))->toBe($baselineItems)
        ->and($report->content['topics'])->toMatchArray([
            'entries_by_topic' => ['travel' => 2],
            'candidates_not_applied' => 1,
            'rows_rejected' => 0,
        ]);
});

it('a split row keeps its chapter only in the catalogue tag it names', function (): void {
    config(['azkar_topics.chapters' => [27 => ['split' => 'morning-and-evening', 'status' => 'reviewed', 'evidence' => 'fixture']]]);

    topicsRun();

    expect(topicsBrowse())->toBe([
        'morning-topic' => [[3, 'morning']],
        'evening-topic' => [],
        'travel' => [[2, '*']],
    ])
        ->and(topicsSessions()['evening'])->toBe([[4, 'evening']]);
});

it('a topic whose id is already a tag category is appended to it, with no repeated entry', function (): void {
    config(['azkar_topics.chapters' => [25 => topicsRow('travel')]]);

    topicsRun();

    $browse = topicsBrowse();

    expect($browse['travel'])->toBe([[4, '*'], [2, '*']])
        ->and(array_keys($browse))->toBe(['morning-topic', 'evening-topic', 'travel'])
        ->and(AzkarCategory::query()->where('id', 'travel')->count())->toBe(1);
});

it('a tag whose entries all move to reviewed topics is not emitted, and a tag that was already empty still is', function (): void {
    config(['azkar_topics.chapters' => [
        25 => topicsRow('prayer'),
        27 => topicsRow('prayer'),
    ]]);

    topicsRun();

    $browse = topicsBrowse();

    expect(array_keys($browse))->not->toContain('travel')
        ->and(array_keys($browse))->not->toContain('morning-topic')
        ->and($browse['evening-topic'])->toBe([])
        ->and($browse['prayer'])->toBe([[2, '*'], [3, '*'], [4, '*']]);
});

it('a full set of reviewed rows lists each entry in at most one browse topic, and keeps the sessions', function (): void {
    topicsRun();
    $baselineSessions = topicsSessions();

    config(['azkar_topics.chapters' => [
        1 => topicsRow('waking-topic'),
        25 => topicsRow('prayer'),
        27 => ['split' => 'morning-and-evening', 'status' => 'reviewed', 'evidence' => 'fixture'],
    ]]);

    topicsRun();

    $listed = [];

    foreach (topicsBrowse() as $links) {
        foreach ($links as [$entryId]) {
            $listed[$entryId] = ($listed[$entryId] ?? 0) + 1;
        }
    }

    expect(array_keys(topicsBrowse()))->toBe(['morning-topic', 'evening-topic', 'waking-topic', 'prayer'])
        ->and($listed)->toEqual([1 => 1, 2 => 1, 3 => 1])
        ->and(topicsSessions())->toBe($baselineSessions);
});

it('session categories and the items, segments, notes and recordings are the same with and without rows', function (): void {
    topicsRun();
    $tables = ['azkar_items', 'azkar_segments', 'azkar_notes', 'azkar_recordings'];
    $baselineSessions = topicsSessions();
    $baselineTables = array_combine($tables, array_map(topicsTableRows(...), $tables));

    config(['azkar_topics.chapters' => [
        1 => topicsRow('waking-topic'),
        25 => topicsRow('prayer'),
        27 => ['split' => 'morning-and-evening', 'status' => 'reviewed', 'evidence' => 'fixture'],
    ]]);
    topicsRun();

    expect(topicsSessions())->toBe($baselineSessions)
        ->and(array_combine($tables, array_map(topicsTableRows(...), $tables)))->toBe($baselineTables)
        ->and($baselineTables['azkar_items'])->not->toBeEmpty();
});

it('reports the entries per topic and the rows rejected, and an unknown topic row changes nothing', function (): void {
    topicsRun();
    $baselineBrowse = topicsBrowse();

    config(['azkar_topics.chapters' => [
        1 => topicsRow('waking-topic'),
        25 => topicsRow('not-a-topic'),
    ]]);
    $report = topicsRun();

    expect($report->content['topics'])->toMatchArray([
        'entries_by_topic' => ['waking-topic' => 1, 'travel' => 2],
        'candidates_not_applied' => 0,
        'rows_rejected' => 1,
    ])
        ->and(topicsBrowse())->toBe([
            'morning-topic' => $baselineBrowse['morning-topic'],
            'evening-topic' => [],
            'travel' => $baselineBrowse['travel'],
            'waking-topic' => [[1, '*']],
        ]);
});

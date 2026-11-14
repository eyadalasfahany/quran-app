<?php

declare(strict_types=1);

use App\Domains\Seerah\Canonical\CanonicalBuild;
use App\Domains\Seerah\Enums\ReviewStatus;
use App\Domains\Seerah\Format\SeerahJson;
use App\Domains\Seerah\Review\ReviewRecords;
use App\Domains\Seerah\Validation\Issue;
use App\Domains\Seerah\Validation\Severity;
use App\Domains\Seerah\Validation\ValidationRun;
use Illuminate\Support\Facades\File;
use Tests\Support\SeerahFixture;
use Tests\TestCase;

// Placeholder data only (ADR 0089): every quote and name is a marked placeholder from SeerahFixture.

uses(TestCase::class);

beforeEach(function (): void {
    SeerahFixture::applyConfig();
});

/**
 * The issues of one rule at one severity.
 *
 * @return list<Issue>
 */
function seerahRuleIssues(ValidationRun $run, string $rule, Severity $severity = Severity::Error): array
{
    return array_values(array_filter(
        $run->issues->all(),
        static fn (Issue $issue): bool => $issue->rule === $rule && $issue->severity === $severity,
    ));
}

/**
 * A fresh fixture: the build, its folder, and its passing files, written to disk.
 *
 * @return array{0: string, 1: CanonicalBuild, 2: array<string, array<string, mixed>>}
 */
function seerahFixtureOnDisk(bool $braces = false): array
{
    $build = SeerahFixture::build($braces);
    $directory = SeerahFixture::directory();
    $files = SeerahFixture::files($build);
    SeerahFixture::write($directory, $build, $files);

    return [$directory, $build, $files];
}

/**
 * Re-writes the folder from changed files and validates it.
 *
 * @param  array<string, array<string, mixed>>  $files
 */
function seerahRevalidate(string $directory, $build, array $files, bool $release = false, bool $complete = false): ValidationRun
{
    SeerahFixture::write($directory, $build, $files);

    return SeerahFixture::validate($directory, $build, $release, $complete);
}

it('passes the placeholder data set in structure mode with no error', function (): void {
    [$directory, $build] = seerahFixtureOnDisk();
    $run = SeerahFixture::validate($directory, $build);

    expect($run->issues->hasErrors())->toBeFalse()
        ->and($run->issues->all())->not->toBeEmpty();
});

it('V1 fails when structure.json differs from the canonical text, and passes when it matches', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();

    expect(seerahRuleIssues(SeerahFixture::validate($directory, $build), 'V1'))->toBe([]);

    File::put($directory.'/book/structure.json', str_replace('عنوان تجريبي ٣', 'عنوان مختلف', (string) File::get($directory.'/book/structure.json')));

    expect(seerahRuleIssues(SeerahFixture::validate($directory, $build), 'V1'))->not->toBeEmpty();
});

it('V2 fails on an unknown key and on a file that is not in the canonical format', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E1.json']['events'][0]['extra'] = 'FIXTURE';

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V2'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    File::put($directory.'/gazetteer.json', str_replace('"format": 1', '"format":   1', (string) File::get($directory.'/gazetteer.json')));

    $messages = array_map(static fn (Issue $issue): string => $issue->message, seerahRuleIssues(SeerahFixture::validate($directory, $build), 'V2'));

    expect(implode(' ', $messages))->toContain('not in the canonical format');
});

it('V2 fails on a duplicate event id across batches and on a malformed place id', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E2.json']['events'][0]['id'] = 'e001';
    $files['gazetteer.json']['places'][2]['id'] = 'Fx City';

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V2'))->toHaveCount(2);
});

it('V3 fails on a quote that is one byte off the paragraph and passes the exact one', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();

    expect(seerahRuleIssues(SeerahFixture::validate($directory, $build), 'V3'))->toBe([]);

    $files['events/E1.json']['events'][0]['place']['evidence'][0]['quote'] = 'مدينة تجريبيه';

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V3'))->not->toBeEmpty();
});

it('V3 fails on a quote shorter than 8 characters, with surrounding space, and on a missing paragraph', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E2.json']['events'][0]['year']['evidence'][0]['quote'] = ' فيه ';
    $files['events/E1.json']['events'][0]['year']['evidence'][0]['para'] = 'p09999';

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V3'))->toHaveCount(3);
});

it('V4 fails on a place id that does not exist and on a parent cycle', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E2.json']['events'][0]['place']['id'] = 'fx-missing';

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V4'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['gazetteer.json']['places'][1]['parent'] = 'fx-city';

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V4'))->not->toBeEmpty();
});

it('V5 fails when no quote of a place holds its name', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['gazetteer.json']['places'][2]['evidence'] = [['para' => 'p00001', 'quote' => 'نص تجريبي أول']];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V5'))->toHaveCount(1);
});

it('V6 fails on coordinates outside the box, on a landmark far from its city, and passes the fixture', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();

    expect(seerahRuleIssues(SeerahFixture::validate($directory, $build), 'V6'))->toBe([]);

    $files['gazetteer.json']['places'][2]['geo']['lat'] = 60.0;

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V6'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['gazetteer.json']['places'][3]['geo']['lat'] = 21.9;

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V6'))->toHaveCount(1);
});

it('V7 fails when a place used by an event is not drawn, and when a drawn position leaves its viewbox', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['map/layout.fx-city.json']['positions'] = [];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V7'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['map/layout.region.json']['positions'][1]['x'] = 1500;

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V7'))->not->toBeEmpty();
});

it('V7 fails when the drawing puts a northern place to the south', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['map/layout.region.json']['positions'][0]['y'] = 900;

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V7'))->not->toBeEmpty();
});

it('V8 fails on a title that is not the heading, and on a span outside its section', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E1.json']['events'][0]['title_ar'] = 'عنوان مختلف';

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V8'))->toHaveCount(1);

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E1.json']['events'][0]['span'] = ['from' => 'p00003', 'to' => 'p00003'];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V8'))->toHaveCount(1);
});

it('V9 fails when a stated place has no quote inside the span, and when an event has no year', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E1.json']['events'][1]['place']['evidence'] = [['para' => 'p00001', 'quote' => 'مدينة تجريبية']];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V9'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E2.json']['events'][0]['year'] = null;

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V9'))->not->toBeEmpty();
});

it('V9 accepts an outside quote only with the flag evidence_outside_span', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E1.json']['events'][1]['place']['evidence'] = [['para' => 'p00001', 'quote' => 'مدينة تجريبية']];
    $files['events/E1.json']['events'][1]['flags'] = [['code' => 'evidence_outside_span', 'note' => 'FIXTURE note']];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V9'))->toBe([]);
});

it('V10 fails a flagged record without a decision in release mode, and only counts it in structure mode', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E2.json']['events'][0]['flags'] = [['code' => 'disputed_date', 'note' => 'FIXTURE note']];

    expect(seerahRuleIssues(SeerahFixture::validate($directory, $build), 'V10'))->toBe([])
        ->and(seerahRuleIssues(seerahRevalidate($directory, $build, $files, true, true), 'V10'))->not->toBeEmpty();
});

it('V10 fails an implied place without its flag and a year bucket without year_not_stated', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E2.json']['events'][0]['place']['basis'] = 'implied';
    $files['events/E2.json']['events'][0]['year'] = SeerahFixture::year('unspecified', null, null, null, null, null, 'unspecified', []);

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V10'))->toHaveCount(2);
});

it('V11 fails an age outside 0 to 63, an era that disagrees with the convention, and warns on a stated age with no age word', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E2.json']['events'][0]['year']['age_to'] = 70;

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V11'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E1.json']['events'][0]['year']['era'] = 'bh';

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V11'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E2.json']['events'][0]['year']['evidence'] = [['para' => 'p00004', 'quote' => 'نص تجريبي رابع']];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V11', Severity::Warning))->toHaveCount(1);
});

it('V12 fails an event older than the one before it, and an event outside the year of its heading', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E2.json']['events'][0]['year'] = SeerahFixture::year('stated_age', 50, 50, 'bh', 3, 3, 'stated', [['para' => 'p00004', 'quote' => 'بلغ فيه سنا تجريبيا']]);

    expect(array_map(static fn (Issue $issue): string => $issue->message, seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V12')))
        ->toContain('the event is older than the one before it in book order (add an order exception if the book tells it out of order)');

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E1.json']['events'][1]['year'] = SeerahFixture::year('section_year', 54, 54, 'ah', 2, 2, 'stated', []);

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V12'))->not->toBeEmpty();
});

it('V12 exempts an event the book tells out of order, with its exception', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E2.json']['events'][0]['year'] = SeerahFixture::year('stated_age', 50, 50, 'bh', 3, 3, 'stated', [['para' => 'p00004', 'quote' => 'بلغ فيه سنا تجريبيا']]);
    $files['events/E2.json']['events'][0]['order_exception'] = ['note' => 'FIXTURE exception'];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V12'))->toBe([]);
});

it('V13 warns on an uncovered section in structure mode and fails with --complete', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['exclusions.json']['excluded'] = [];

    $structure = seerahRevalidate($directory, $build, $files);

    expect(seerahRuleIssues($structure, 'V13'))->toBe([])
        ->and(seerahRuleIssues($structure, 'V13', Severity::Warning))->toHaveCount(1)
        ->and(seerahRuleIssues(seerahRevalidate($directory, $build, $files, false, true), 'V13'))->toHaveCount(1);
});

it('V13 fails overlapping spans, an event in the wrong batch file, a section both covered and excluded, and a batch that misses its heading', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E1.json']['events'][] = SeerahFixture::event('e004', 's001', 'عنوان تجريبي ١', ['from' => 'p00001', 'to' => 'p00001'], [
        'id' => 'fx-city', 'basis' => 'stated', 'evidence' => [['para' => 'p00001', 'quote' => 'مدينة تجريبية']], 'also' => [],
    ], SeerahFixture::year('stated_age', 53, 53, 'ah', 1, 1, 'stated', [['para' => 'p00002', 'quote' => 'في سن تجريبية']]));

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V13'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $moved = array_pop($files['events/E2.json']['events']);
    $files['events/E1.json']['events'][] = $moved;

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V13'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['exclusions.json']['excluded'][] = ['section' => 's001', 'reason' => 'front_matter', 'note' => null];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V13'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    config(['seerah.batches.E2.start_title' => 'عنوان آخر']);

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V13'))->not->toBeEmpty();
});

it('V14 fails a route with one stop and a drawn curve that does not start on its stop', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['routes.json']['routes'] = [['id' => 'r-fixture', 'name_ar' => 'طريق تجريبي', 'stops' => ['fx-city'], 'events' => [], 'evidence' => [], 'kind' => 'trip']];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V14'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['routes.json']['routes'] = [['id' => 'r-fixture', 'name_ar' => 'طريق تجريبي', 'stops' => ['fx-city', 'fx-region'], 'events' => [], 'evidence' => [], 'kind' => 'trip']];
    $files['map/layout.region.json']['route_paths'] = [['route' => 'r-fixture', 'segment' => ['fx-city', 'fx-region'], 'd' => 'M 10 10 L 700 200']];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V14'))->not->toBeEmpty();
});

it('V15 fails a milestone that points at a missing event, and a key outside the configured six', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['milestones.json']['milestones'][0]['event'] = 'e999';

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V15'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['milestones.json']['milestones'][0]['id'] = 'death';

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V15'))->not->toBeEmpty();
});

it('V16 warns on a braced run in the book and reports none for the placeholder book', function (): void {
    [$directory, $build] = seerahFixtureOnDisk();

    expect(seerahRuleIssues(SeerahFixture::validate($directory, $build), 'V16', Severity::Warning))->toBe([]);

    [$directory, $build, $files] = seerahFixtureOnDisk(braces: true);

    expect(seerahRuleIssues(SeerahFixture::validate($directory, $build), 'V16', Severity::Warning))->toHaveCount(1);
});

it('V17 lists drafts in structure mode and fails them in release mode', function (): void {
    [$directory, $build] = seerahFixtureOnDisk();
    $structure = SeerahFixture::validate($directory, $build);

    expect(seerahRuleIssues($structure, 'V17'))->toBe([])
        ->and(seerahRuleIssues(SeerahFixture::validate($directory, $build, true, true), 'V17'))->not->toBeEmpty();
});

it('V17 fails a sign-off whose digest does not match its records', function (): void {
    [$directory, $build] = seerahFixtureOnDisk();
    File::ensureDirectoryExists($directory.'/reviews');
    File::put($directory.'/reviews/E1.json', SeerahJson::render([
        'format' => 1, 'group' => 'E1', 'signed_by' => 'developer', 'signed_at' => '2026-11-14',
        'records' => ['e001' => str_repeat('a', 64)], 'decisions' => new stdClass, 'digest' => str_repeat('b', 64),
    ]));

    expect(seerahRuleIssues(SeerahFixture::validate($directory, $build), 'V17'))->not->toBeEmpty();
});

it('V18 fails an unknown origin, an unknown flag code, and a flag that is not allowed on a place', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E1.json']['events'][0]['origin'] = 'human';

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V18'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E1.json']['events'][0]['flags'] = [['code' => 'no_such_flag', 'note' => null]];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V18'))->not->toBeEmpty();

    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['gazetteer.json']['places'][2]['flags'] = [['code' => 'year_not_stated', 'note' => 'FIXTURE']];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V18'))->toHaveCount(1);
});

it('V19 prints the counts, and reports nothing when no pin is checked', function (): void {
    [$directory, $build] = seerahFixtureOnDisk();
    $run = SeerahFixture::validate($directory, $build);

    expect(seerahRuleIssues($run, 'V19', Severity::Info))->toHaveCount(1)
        ->and(seerahRuleIssues($run, 'V19'))->toBe([]);
});

it('passes release mode when every group is signed and every flag has its decision', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['gazetteer.json']['places'][0]['flags'] = [['code' => 'not_in_book_directly', 'note' => 'FIXTURE']];

    $run = seerahRevalidate($directory, $build, $files);
    $records = [];

    foreach (ReviewRecords::of($run->data) as $record) {
        $records[$record->group][$record->id] = $record->hash;
    }

    foreach ($records as $group => $map) {
        File::ensureDirectoryExists($directory.'/reviews');
        File::put($directory.'/reviews/'.$group.'.json', SeerahJson::render([
            'format' => 1, 'group' => $group, 'signed_by' => 'developer', 'signed_at' => '2026-11-14', 'records' => $map,
            'decisions' => $group === 'G' ? ['other' => ['codes' => ['not_in_book_directly'], 'note' => 'FIXTURE decision']] : new stdClass,
            'digest' => ReviewRecords::digest($map),
        ]));
    }

    $release = SeerahFixture::validate($directory, $build, true, true);

    expect($release->issues->hasErrors())->toBeFalse();

    foreach (ReviewRecords::of($release->data) as $record) {
        expect(ReviewRecords::statusOf($record, $release->data))->toBe(ReviewStatus::Approved);
    }
});

it('V13 reports a gap in a span partition: a paragraph no event covers', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $files['events/E1.json']['events'][0]['span'] = ['from' => 'p00001', 'to' => 'p00001'];

    expect(seerahRuleIssues(seerahRevalidate($directory, $build, $files), 'V13', Severity::Warning))->toHaveCount(1)
        ->and(seerahRuleIssues(seerahRevalidate($directory, $build, $files, false, true), 'V13'))->toHaveCount(1);
});

it('V17 reports a stale record in release mode when its content changed after the sign-off', function (): void {
    [$directory, $build, $files] = seerahFixtureOnDisk();
    $run = seerahRevalidate($directory, $build, $files);
    $records = [];

    foreach (ReviewRecords::of($run->data) as $record) {
        $records[$record->group][$record->id] = $record->hash;
    }

    foreach ($records as $group => $map) {
        File::ensureDirectoryExists($directory.'/reviews');
        File::put($directory.'/reviews/'.$group.'.json', SeerahJson::render([
            'format' => 1, 'group' => $group, 'signed_by' => 'developer', 'signed_at' => '2026-11-14', 'records' => $map,
            'decisions' => new stdClass, 'digest' => ReviewRecords::digest($map),
        ]));
    }

    $files['events/E1.json']['events'][0]['note'] = 'FIXTURE changed after the sign-off';

    $messages = array_map(static fn (Issue $issue): string => $issue->message, seerahRuleIssues(seerahRevalidate($directory, $build, $files, true, true), 'V17'));

    expect(implode(' ', $messages))->toContain('the record is stale');
});

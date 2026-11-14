<?php

declare(strict_types=1);

use App\Domains\Seerah\Review\ReviewRecords;
use App\Domains\Seerah\Review\SignOffApprover;
use Tests\Support\SeerahFixture;
use Tests\TestCase;

// Placeholder data only (ADR 0089). The approver is pure: it builds the sign-off file; the command asks the developer and writes it.

uses(TestCase::class);

beforeEach(function (): void {
    SeerahFixture::applyConfig();
});

it('builds the sign-off of a clean group with its records, the digest of those records and no refusal', function (): void {
    $build = SeerahFixture::build();
    $directory = SeerahFixture::directory();
    SeerahFixture::write($directory, $build, SeerahFixture::files($build));
    $run = SeerahFixture::validate($directory, $build);
    $approver = new SignOffApprover;

    expect($approver->refusals('E1', $run->data, $run->issues))->toBe([]);

    $prepared = $approver->build('E1', $run->data, 'developer', '2026-11-14');
    $decoded = json_decode($prepared['json'], true, flags: JSON_THROW_ON_ERROR);

    expect($decoded['group'])->toBe('E1')
        ->and(array_keys($decoded['records']))->toBe(['e001', 'e002'])
        ->and($decoded['digest'])->toBe(ReviewRecords::digest($decoded['records']))
        ->and($prepared['digest'])->toBe($decoded['digest'])
        ->and($prepared['count'])->toBe(2);
});

it('refuses a group while the validator reports an error, and a group with an undecided flag', function (): void {
    $build = SeerahFixture::build();
    $directory = SeerahFixture::directory();
    $files = SeerahFixture::files($build);
    $files['events/E1.json']['events'][0]['title_ar'] = 'عنوان مختلف';
    SeerahFixture::write($directory, $build, $files);
    $run = SeerahFixture::validate($directory, $build);

    expect(implode(' ', (new SignOffApprover)->refusals('E1', $run->data, $run->issues)))->toContain('validator reports errors');

    $files = SeerahFixture::files($build);
    $files['events/E2.json']['events'][0]['flags'] = [['code' => 'disputed_date', 'note' => 'FIXTURE note']];
    SeerahFixture::write($directory, $build, $files);
    $run = SeerahFixture::validate($directory, $build);

    expect(implode(' ', (new SignOffApprover)->refusals('E2', $run->data, $run->issues)))->toContain('no decision in reviews/E2.json');
});

it('refuses an empty group', function (): void {
    $build = SeerahFixture::build();
    $directory = SeerahFixture::directory();
    SeerahFixture::write($directory, $build, SeerahFixture::files($build));
    $run = SeerahFixture::validate($directory, $build);

    expect(implode(' ', (new SignOffApprover)->refusals('E4', $run->data, $run->issues)))->toContain('has no records to sign');
});

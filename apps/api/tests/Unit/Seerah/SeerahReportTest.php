<?php

declare(strict_types=1);

use App\Domains\Seerah\Report\ReportContext;
use App\Domains\Seerah\Report\SeerahReport;
use App\Domains\Seerah\Review\SignOffApprover;
use Tests\Support\SeerahFixture;
use Tests\TestCase;

// Placeholder data only (ADR 0089): the report is built from SeerahFixture, so every quote and name in it is a placeholder.

uses(TestCase::class);

beforeEach(function (): void {
    SeerahFixture::applyConfig();
});

/**
 * The rendered report of a fixture, optionally with its files changed first.
 *
 * @param  null|callable(array<string, array<string, mixed>>): array<string, array<string, mixed>>  $change
 */
function seerahRenderedFixture(?callable $change = null): array
{
    $build = SeerahFixture::build();
    $directory = SeerahFixture::directory();
    $files = SeerahFixture::files($build);

    if ($change !== null) {
        $files = $change($files);
    }

    SeerahFixture::write($directory, $build, $files);
    $run = SeerahFixture::validate($directory, $build);
    $batches = (array) config('seerah.batches');
    $context = new ReportContext($run, $build, $batches);

    return [(new SeerahReport)->render($context), $context];
}

it('writes one right-to-left Arabic page with every view in order, and no network reference', function (): void {
    [$html] = seerahRenderedFixture();

    expect($html)->toStartWith('<!doctype html><html lang="ar" dir="rtl">')
        ->and(strpos($html, 'id="overview"'))->toBeLessThan(strpos($html, 'id="unset"'))
        ->and(strpos($html, 'id="unset"'))->toBeLessThan(strpos($html, 'id="years"'))
        ->and(strpos($html, 'id="years"'))->toBeLessThan(strpos($html, 'id="places"'))
        ->and(strpos($html, 'id="places"'))->toBeLessThan(strpos($html, 'id="maps"'))
        ->and(strpos($html, 'id="maps"'))->toBeLessThan(strpos($html, 'id="flags"'))
        ->and(strpos($html, 'id="flags"'))->toBeLessThan(strpos($html, 'id="coverage"'))
        ->and(strpos($html, 'id="coverage"'))->toBeLessThan(strpos($html, 'id="runs"'))
        ->and(strpos($html, 'id="runs"'))->toBeLessThan(strpos($html, 'id="signoff"'))
        ->and($html)->not->toContain('http://')
        ->and($html)->not->toContain('https://')
        ->and($html)->not->toContain('<link ')
        ->and($html)->not->toContain('<script src');
});

it('highlights a quote inside its own paragraph and keeps the rest of the paragraph as the book has it', function (): void {
    [$html] = seerahRenderedFixture();

    expect($html)->toContain('نص تجريبي أول في <mark>مدينة تجريبية</mark> للاختبار');
});

it('escapes every value it writes, names and titles included', function (): void {
    [$html] = seerahRenderedFixture(function (array $files): array {
        $files['gazetteer.json']['places'][2]['name_ar'] = '<b>مدينة & تجريبية</b>';

        return $files;
    });

    expect($html)->toContain('&lt;b&gt;مدينة &amp; تجريبية&lt;/b&gt;')
        ->and($html)->not->toContain('<b>مدينة');
});

it('shows the digest of each group as the approver computes it, so the developer can match them', function (): void {
    [$html, $context] = seerahRenderedFixture();
    $run = $context->run;
    $prepared = (new SignOffApprover)->build('E1', $run->data, 'developer', '2026-11-14');

    expect($context->digest('E1'))->toBe($prepared['digest'])
        ->and($html)->toContain('digest E1: <span class="ltr">'.$prepared['digest'].'</span>');
});

it('lists the events of the unset buckets first, and says so when there are none', function (): void {
    [$html] = seerahRenderedFixture();

    expect($html)->toContain('لا أحداث في «أخرى» أو «غير محدد».');

    [$html] = seerahRenderedFixture(function (array $files): array {
        $files['events/E2.json']['events'][0]['place'] = ['id' => 'other', 'basis' => 'unstated', 'evidence' => [], 'also' => []];
        $files['events/E2.json']['events'][0]['flags'] = [['code' => 'place_not_stated', 'note' => 'FIXTURE note']];

        return $files;
    });

    expect($html)->toContain('id="e003"')
        ->and($html)->toContain('data-batch="E2"');
});

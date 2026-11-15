<?php

declare(strict_types=1);

/*
| ADR 0092 decisions 1-2: azkar:topics-check checks config azkar_topics.php against config azkar.chapter_titles_ar and
| azkar.split_topics. It reads config only. A topic id with no chapter is allowed (its zero count is shown, not a problem).
*/

/**
 * @return array<string, mixed>
 */
function topicsCheckShipped(): array
{
    /** @var array<string, mixed> $shipped */
    $shipped = require config_path('azkar_topics.php');

    return $shipped;
}

beforeEach(function (): void {
    config(['azkar_topics' => topicsCheckShipped()]);
});

it('passes on the shipped config, with every chapter once', function (): void {
    $this->artisan('azkar:topics-check')
        ->expectsOutputToContain('Reviewed rows applied: 132')
        ->expectsOutputToContain('azkar:topics-check passed.')
        ->assertExitCode(0);
});

it('fails when a chapter of the Hisn list has no row', function (): void {
    $chapters = topicsCheckShipped()['chapters'];
    unset($chapters[5]);
    config(['azkar_topics.chapters' => $chapters]);

    $this->artisan('azkar:topics-check')
        ->expectsOutputToContain('chapter 5: missing')
        ->assertExitCode(1);
});

it('fails on a row that names an unknown topic', function (): void {
    config(['azkar_topics.chapters' => array_replace(topicsCheckShipped()['chapters'], [1 => ['topic' => 'not-a-topic', 'status' => 'reviewed', 'evidence' => 'fixture']])]);

    $this->artisan('azkar:topics-check')
        ->expectsOutputToContain('chapter 1: invalid row (unknown_topic)')
        ->assertExitCode(1);
});

it('fails on a split row that names a tag which is not in azkar.split_topics', function (): void {
    config(['azkar_topics.chapters' => array_replace(topicsCheckShipped()['chapters'], [27 => ['split' => 'not-a-tag', 'status' => 'reviewed', 'evidence' => 'fixture']])]);

    $this->artisan('azkar:topics-check')
        ->expectsOutputToContain('chapter 27: invalid row (unknown_split)')
        ->assertExitCode(1);
});

it('fails on a chapter number that is not in azkar.chapter_titles_ar', function (): void {
    config(['azkar_topics.chapters' => array_replace(topicsCheckShipped()['chapters'], [133 => ['topic' => 'prayer', 'status' => 'reviewed', 'evidence' => 'fixture']])]);

    $this->artisan('azkar:topics-check')
        ->expectsOutputToContain('133: not a chapter of config azkar.chapter_titles_ar')
        ->assertExitCode(1);
});

it('lists a candidate row as a warning and still passes', function (): void {
    config(['azkar_topics.chapters' => array_replace(topicsCheckShipped()['chapters'], [1 => ['topic' => 'prayer', 'status' => 'candidate', 'evidence' => 'claude:keyword-rule']])]);

    $this->artisan('azkar:topics-check')
        ->expectsOutputToContain('1 candidate row(s) are not applied')
        ->assertExitCode(0);
});

it('accepts a topic id that no chapter uses, and shows it with zero counts', function (): void {
    config(['azkar_topics.topics' => [...topicsCheckShipped()['topics'], 'topic-without-chapter' => ['ar' => 'FIXTURE topic', 'en' => 'FIXTURE topic']]]);

    $this->artisan('azkar:topics-check')
        ->expectsOutputToContain('topic-without-chapter')
        ->expectsOutputToContain('azkar:topics-check passed.')
        ->assertExitCode(0);
});

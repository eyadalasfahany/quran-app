<?php

declare(strict_types=1);

use App\Domains\Duas\Services\DuasTopicPolicy;

it('emits only reviewed rows as links, for both target kinds', function (): void {
    $resolved = app(DuasTopicPolicy::class)->resolve([
        'quran' => [
            'quran:2:128' => ['topic' => 'topic-alpha', 'status' => 'reviewed', 'evidence' => 'developer:test'],
        ],
        'hadith_chapters' => [
            'hadithchapter:bukhari:80:1' => ['topic' => 'topic-beta', 'status' => 'reviewed', 'evidence' => 'developer:test'],
        ],
    ], ['topic-alpha', 'topic-beta']);

    expect($resolved['links'])->toBe([
        ['topic_id' => 'topic-alpha', 'target_kind' => 'quran', 'target_key' => 'quran:2:128'],
        ['topic_id' => 'topic-beta', 'target_kind' => 'hadith_chapter', 'target_key' => 'hadithchapter:bukhari:80:1'],
    ])
        ->and($resolved['candidates'])->toBe([])
        ->and($resolved['invalid'])->toBe([]);
});

it('ignores candidate rows and lists them as candidates', function (): void {
    $resolved = app(DuasTopicPolicy::class)->resolve([
        'quran' => [
            'quran:2:129' => ['topic' => 'topic-alpha', 'status' => 'candidate', 'evidence' => 'claude:test'],
        ],
    ], ['topic-alpha', 'topic-beta']);

    expect($resolved['links'])->toBe([])
        ->and($resolved['candidates'])->toBe(['quran:2:129']);
});

it('lists rows with an unknown topic, a bad key, a bad status or no evidence as invalid', function (): void {
    $resolved = app(DuasTopicPolicy::class)->resolve([
        'quran' => [
            'quran:2:130' => ['topic' => 'unknown-topic', 'status' => 'reviewed', 'evidence' => 'developer:test'],
            'quran:two:131' => ['topic' => 'topic-alpha', 'status' => 'reviewed', 'evidence' => 'developer:test'],
            'quran:2:132' => ['topic' => 'topic-alpha', 'status' => 'approved', 'evidence' => 'developer:test'],
            'quran:2:133' => ['topic' => 'topic-alpha', 'status' => 'reviewed', 'evidence' => ' '],
        ],
        'hadith_chapters' => [
            'hadithchapter:bukhari:80' => ['topic' => 'topic-alpha', 'status' => 'reviewed', 'evidence' => 'developer:test'],
        ],
    ], ['topic-alpha', 'topic-beta']);

    expect($resolved['links'])->toBe([])
        ->and($resolved['invalid'])->toBe([
            'quran:2:130',
            'quran:two:131',
            'quran:2:132',
            'quran:2:133',
            'hadithchapter:bukhari:80',
        ]);
});

<?php

declare(strict_types=1);

// The expected names are copied from docs/plans/phase-7.md ("Titles data") by script, never retyped.

/**
 * @return array<string, array{title_ar: string, author_ar: string|null}>
 */
function hadithTitlesExpected(): array
{
    return [
        'bukhari' => ['title_ar' => 'صحيح البخاري', 'author_ar' => 'الإمام محمد بن إسماعيل البخاري'],
        'muslim' => ['title_ar' => 'صحيح مسلم', 'author_ar' => 'الإمام مسلم بن الحجاج النيسابوري'],
        'abudawud' => ['title_ar' => 'سنن أبي داود', 'author_ar' => 'الإمام أبو داود سليمان بن الأشعث السجستاني'],
        'tirmidhi' => ['title_ar' => 'جامع الترمذي', 'author_ar' => 'الإمام أبو عيسى محمد بن عيسى الترمذي'],
        'ibnmajah' => ['title_ar' => 'سنن ابن ماجه', 'author_ar' => 'الإمام محمد بن يزيد ابن ماجه القزويني'],
        'nasai' => ['title_ar' => 'سنن النسائي', 'author_ar' => 'الإمام أحمد بن شعيب النسائي'],
        'malik' => ['title_ar' => 'موطأ مالك', 'author_ar' => 'الإمام مالك بن أنس'],
        'nawawi40' => ['title_ar' => 'الأربعون النووية', 'author_ar' => 'الإمام يحيى بن شرف النووي'],
        'qudsi40' => ['title_ar' => 'الأحاديث القدسية', 'author_ar' => null],
        'shahwaliullah40' => ['title_ar' => 'الأربعون لولي الله الدهلوي', 'author_ar' => 'الإمام شاه ولي الله الدهلوي'],
    ];
}

it('has exactly the ten slugs in the order of config hadith.collections', function (): void {
    expect(array_keys(config('hadith_titles.collections')))->toBe(config('hadith.collections'));
});

it('has a non-empty Arabic collection name from ummahapi.com on every entry', function (): void {
    foreach (config('hadith_titles.collections') as $entry) {
        expect(array_keys($entry))->toBe([
            'title_ar',
            'title_ar_source',
            'author_ar',
            'author_ar_source',
            'author_ar_status',
        ])
            ->and($entry['title_ar'])->toBeString()
            ->and($entry['title_ar'])->toMatch('/^[\p{Arabic}\s]+$/u')
            ->and($entry['title_ar'])->not->toMatch('/^\s|\s$/u')
            ->and($entry['title_ar_source'])->toBe('ummahapi.com');
    }
});

it('keeps every collection name byte equal to the plan', function (): void {
    $expected = hadithTitlesExpected();

    expect($expected)->toHaveCount(10);

    foreach ($expected as $slug => $plan) {
        $entry = config('hadith_titles.collections.'.$slug);

        expect($entry['title_ar'])->toBe($plan['title_ar'])
            ->and(strlen($entry['title_ar']))->toBe(strlen($plan['title_ar']))
            ->and($entry['author_ar'])->toBe($plan['author_ar']);

        if ($plan['author_ar'] !== null) {
            expect(strlen($entry['author_ar']))->toBe(strlen($plan['author_ar']));
        }
    }
});

it('marks every author as drafted and approved, and qudsi40 has none', function (): void {
    foreach (config('hadith_titles.collections') as $slug => $entry) {
        if ($slug === 'qudsi40') {
            expect($entry['author_ar'])->toBeNull()
                ->and($entry['author_ar_source'])->toBeNull()
                ->and($entry['author_ar_status'])->toBeNull();

            continue;
        }

        expect($entry['author_ar'])->toBeString()
            ->and($entry['author_ar_source'])->toBe('developer')
            ->and($entry['author_ar_status'])->toBe('approved');
    }
});

it('has section titles only for known collections, each a non-empty title from hadithapi.com or OpenITI', function (): void {
    $sections = config('hadith_titles.sections');

    expect($sections)->toBeArray()->not->toBeEmpty();

    foreach ($sections as $slug => $titles) {
        expect(config('hadith.collections'))->toContain($slug);

        foreach ($titles as $section => $entry) {
            expect((string) $section)->toMatch('/^\d+(\.\d+)?$/')
                ->and(array_keys($entry))->toBe(['title_ar', 'title_ar_source'])
                ->and($entry['title_ar'])->toBeString()->not->toBe('')
                ->and($entry['title_ar_source'])->toBeIn(['hadithapi.com', 'openiti']);
        }
    }
});

it('contains no Latin text', function (): void {
    foreach (config('hadith_titles.collections') as $entry) {
        expect(preg_match('/[A-Za-z0-9]/', $entry['title_ar']))->toBe(0);

        if ($entry['author_ar'] !== null) {
            expect(preg_match('/[A-Za-z0-9]/', $entry['author_ar']))->toBe(0);
        }
    }
});

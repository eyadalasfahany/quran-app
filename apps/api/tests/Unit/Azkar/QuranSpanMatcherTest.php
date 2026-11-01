<?php

declare(strict_types=1);

use App\Domains\Azkar\Data\QuranSpanMatch;
use App\Domains\Azkar\Exceptions\QuranMapException;
use App\Domains\Azkar\Services\QuranSpanMatcher;
use App\Support\QuranText\SearchTextNormalizer;

/*
| Placeholder verses only (ADR 0031 §4). Nothing here is Quran text: the matcher is tested on its rules, not on content.
*/

/**
 * @return list<array{surah: int, ayah: int, text: string}>
 */
function qmcVerses(): array
{
    return [
        ['surah' => 1, 'ayah' => 1, 'text' => 'FIXTURE basmala'],
        ['surah' => 1, 'ayah' => 2, 'text' => 'FIXTURE one two'],
        ['surah' => 2, 'ayah' => 1, 'text' => 'FIXTURE alpha beta gamma'],
        ['surah' => 2, 'ayah' => 2, 'text' => 'FIXTURE delta epsilon'],
        ['surah' => 2, 'ayah' => 3, 'text' => 'FIXTURE zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma'],
        ['surah' => 3, 'ayah' => 1, 'text' => 'FIXTURE upsilon phi chi'],
        ['surah' => 3, 'ayah' => 2, 'text' => 'FIXTURE psi omega'],
        ['surah' => 4, 'ayah' => 1, 'text' => 'FIXTURE delta epsilon'],
    ];
}

function qmcMatcher(?array $uthmani = null): QuranSpanMatcher
{
    return new QuranSpanMatcher(new SearchTextNormalizer, qmcVerses(), $uthmani ?? qmcVerses());
}

it('matches a span equal to one verse as an exact-simple candidate, with its Uthmani check', function (): void {
    $match = qmcMatcher()->match('FIXTURE alpha beta gamma');

    expect($match)->toBeInstanceOf(QuranSpanMatch::class)
        ->and($match->status)->toBe('candidate')
        ->and($match->evidence)->toBe('exact-simple')
        ->and($match->ranges)->toBe([[2, 1, null]])
        ->and($match->check)->toBe(1.0);
});

it('matches a span equal to a contiguous range within one surah', function (): void {
    $match = qmcMatcher()->match('FIXTURE alpha beta gamma FIXTURE delta epsilon');

    expect($match->status)->toBe('candidate')
        ->and($match->evidence)->toBe('exact-simple')
        ->and($match->ranges)->toBe([[2, 1, 2]]);
});

it('matches a span that runs across a surah boundary as two ranges', function (): void {
    $match = qmcMatcher()->match('FIXTURE zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma FIXTURE upsilon phi chi');

    expect($match->status)->toBe('candidate')
        ->and($match->evidence)->toBe('exact-simple')
        ->and($match->ranges)->toBe([[2, 3, null], [3, 1, null]])
        ->and($match->basmala)->toBe(0);
});

it('matches a basmala line that stands before the next surah, and counts it', function (): void {
    $match = qmcMatcher()->match('FIXTURE zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma FIXTURE basmala FIXTURE upsilon phi chi');

    expect($match->status)->toBe('candidate')
        ->and($match->evidence)->toBe('exact-simple')
        ->and($match->ranges)->toBe([[2, 3, null], [3, 1, null]])
        ->and($match->basmala)->toBe(1);
});

it('matches a leading basmala before ayah 1 of a surah and counts it', function (): void {
    $match = qmcMatcher()->match('FIXTURE basmala FIXTURE alpha beta gamma');

    expect($match->status)->toBe('candidate')
        ->and($match->evidence)->toBe('exact-simple')
        ->and($match->ranges)->toBe([[2, 1, null]])
        ->and($match->basmala)->toBe(1);
});

it('matches a span that is only the basmala as 1:1', function (): void {
    $match = qmcMatcher()->match('FIXTURE basmala');

    expect($match->evidence)->toBe('exact-simple')
        ->and($match->ranges)->toBe([[1, 1, null]]);
});

it('marks a span equal to two different verse runs as ambiguous and unmatched', function (): void {
    $match = qmcMatcher()->match('FIXTURE delta epsilon');

    expect($match->status)->toBe('unmatched')
        ->and($match->evidence)->toBe('ambiguous:2')
        ->and($match->ranges)->toBe([]);
});

it('accepts a near-identical span as a similarity candidate with its score', function (): void {
    $match = qmcMatcher()->match('FIXTURE zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigmx');

    expect($match->status)->toBe('candidate')
        ->and($match->evidence)->toStartWith('similarity:0.9')
        ->and($match->ranges)->toBe([[2, 3, null]]);
});

it('keeps a low-similarity best range as unmatched so the developer can review it', function (): void {
    $match = qmcMatcher()->match('FIXTURE qqq www eee rrr ttt yyy uuu iii');

    expect($match->status)->toBe('unmatched')
        ->and($match->evidence)->toStartWith('similarity:');
});

it('reports a Uthmani check below 1 when the Uthmani text differs from the span', function (): void {
    $uthmani = qmcVerses();
    $uthmani[2]['text'] = 'FIXTURE alpha beta gamm';

    $match = qmcMatcher($uthmani)->match('FIXTURE alpha beta gamma');

    expect($match->evidence)->toBe('exact-simple')
        ->and($match->check)->toBeGreaterThan(0.9)
        ->and($match->check)->toBeLessThan(1.0);
});

it('treats an empty span as unmatched', function (): void {
    $match = qmcMatcher()->match('   ');

    expect($match->status)->toBe('unmatched')
        ->and($match->evidence)->toBe('empty_span');
});

it('refuses a verse list that does not start with the basmala at 1:1', function (): void {
    new QuranSpanMatcher(new SearchTextNormalizer, [['surah' => 2, 'ayah' => 1, 'text' => 'FIXTURE alpha']], [['surah' => 2, 'ayah' => 1, 'text' => 'FIXTURE alpha']]);
})->throws(QuranMapException::class);

<?php

declare(strict_types=1);

use App\Domains\Hadith\Overlay\OpenItiPageMarkers;

/*
| The page-marker closed list (ADR 0076 §3). Placeholder strings only.
*/

it('reports a title that holds a page marker and leaves a title without one alone', function (): void {
    expect(OpenItiPageMarkers::contains('FIXTURE [ص: 1]'))->toBeTrue()
        ->and(OpenItiPageMarkers::contains('FIXTURE title'))->toBeFalse()
        ->and(OpenItiPageMarkers::contains('FIXTURE [x: 1]'))->toBeFalse();
});

it('removes a marker-only title to the empty string', function (): void {
    expect(OpenItiPageMarkers::strip('[ص: 11]'))->toBe('')
        ->and(OpenItiPageMarkers::strip(' [ج: 2] [ص: 11] '))->toBe('');
});

it('removes a marker with its surrounding whitespace and leaves one space', function (): void {
    expect(OpenItiPageMarkers::strip('FIXTURE [ص: 5] title'))->toBe('FIXTURE title')
        ->and(OpenItiPageMarkers::strip('FIXTURE[ص:5]title'))->toBe('FIXTURE title')
        ->and(OpenItiPageMarkers::strip('[ج: 1]FIXTURE'))->toBe('FIXTURE');
});

it('accepts the colon variants and Arabic-Indic digits', function (): void {
    expect(OpenItiPageMarkers::strip('A [ص ٥] B'))->toBe('A B')
        ->and(OpenItiPageMarkers::strip('A [ص：٥٠] B'))->toBe('A B')
        ->and(OpenItiPageMarkers::strip('A [ج: ٢٠٠٣] B'))->toBe('A B');
});

it('leaves text that is not a page marker unchanged', function (): void {
    expect(OpenItiPageMarkers::strip('FIXTURE (5) [FIXTURE] title'))->toBe('FIXTURE (5) [FIXTURE] title');
});

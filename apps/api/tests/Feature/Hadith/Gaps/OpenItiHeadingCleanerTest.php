<?php

declare(strict_types=1);

use App\Domains\Hadith\Overlay\OpenItiHeadingCleaner;

/*
| The heading cleaner of ADR 0076 §3 (step 6b.6), placeholder strings only.
*/

function headingTitle(array $lines): string
{
    return (new OpenItiHeadingCleaner)->clean($lines)->title;
}

it('removes the heading marker with a pipe run', function (): void {
    expect(headingTitle(['### | FIXTURE chapter title 1']))->toBe('FIXTURE chapter title 1');
});

it('removes the heading marker with a dollar run', function (): void {
    expect(headingTitle(['### $ FIXTURE book title 1']))->toBe('FIXTURE book title 1');
});

it('removes PageV and ms tokens', function (): void {
    expect(headingTitle(['### | FIXTURE PageV01P003 title ms12 1']))->toBe('FIXTURE  title  1');
});

it('joins continuation lines with one space and reports them', function (): void {
    $heading = (new OpenItiHeadingCleaner)->clean(['### | FIXTURE A', '~~ FIXTURE B', '~~   FIXTURE C', 'not a continuation']);

    expect($heading->title)->toBe('FIXTURE A FIXTURE B FIXTURE C')
        ->and($heading->hadContinuation)->toBeTrue();
});

it('trims only ASCII whitespace: a no-break space at the end stays', function (): void {
    expect(headingTitle(["### | FIXTURE A \u{00A0}"]))->toBe("FIXTURE A \u{00A0}");
});

it('applies every removal together', function (): void {
    expect(headingTitle(['### | FIXTURE PageV01P004 title', '~~ FIXTURE part ms3']))->toBe('FIXTURE  title FIXTURE part');
});

it('removes a single-hash pipe marker too', function (): void {
    expect(headingTitle(['# | FIXTURE chapter title 1']))->toBe('FIXTURE chapter title 1');
});

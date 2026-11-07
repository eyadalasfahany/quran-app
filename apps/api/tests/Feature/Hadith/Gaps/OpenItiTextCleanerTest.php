<?php

declare(strict_types=1);

use App\Domains\Hadith\Overlay\OpenItiTextCleaner;

/*
| The text cleaner of ADR 0076 §2.4 (G1 to G5), placeholder strings only. Each step is tested alone and together.
*/

function cleanerText(array $lines, int $markerEnd = 0): string
{
    return (new OpenItiTextCleaner)->clean($lines, $markerEnd);
}

it('G2: keeps only what follows the number marker on the first line', function (): void {
    expect(cleanerText(['### | 1 - FIXTURE a'], strlen('### | 1 - ')))->toBe('FIXTURE a');
});

it('G1: removes the leading ~, # and space of every body line', function (): void {
    expect(cleanerText(['x', '~# ~ FIXTURE b']))->toBe('x FIXTURE b');
});

it('G3: removes PageV and ms tokens only, not the neighbouring space', function (): void {
    expect(cleanerText(['FIXTURE PageV01P001 b']))->toBe('FIXTURE  b');
});

it('G4: drops empty and whitespace-only lines and joins the rest with one space', function (): void {
    expect(cleanerText(['FIXTURE a', '   ', '', 'FIXTURE b']))->toBe('FIXTURE a FIXTURE b');
});

it('G5: trims ASCII whitespace at both ends', function (): void {
    expect(cleanerText(["\t FIXTURE a \r\n"]))->toBe('FIXTURE a');
});

it('applies every step together', function (): void {
    expect(cleanerText(['### | 1 - FIXTURE a PageV01P002', '~~ FIXTURE ms12 b', '', '~# FIXTURE c'], strlen('### | 1 - ')))->toBe('FIXTURE a  FIXTURE  b FIXTURE c');
});

it('keeps U+200E and U+200F, diacritics and internal spaces', function (): void {
    $text = "FIXTURE\u{200E} a\u{200F}  b \u{064E}";

    expect(cleanerText([$text]))->toBe($text);
});

it('does not remove anything else: a line with |, $ and ~ in the middle is untouched', function (): void {
    expect(cleanerText(['FIXTURE a | b $ c ~ d']))->toBe('FIXTURE a | b $ c ~ d');
});

it('drops a line that is only a page marker', function (): void {
    expect(cleanerText(['FIXTURE a', 'PageV01P001']))->toBe('FIXTURE a');
});

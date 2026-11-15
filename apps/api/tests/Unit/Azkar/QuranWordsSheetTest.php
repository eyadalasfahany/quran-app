<?php

declare(strict_types=1);

use App\Domains\Azkar\Services\QuranWordsSheet;
use App\Support\QuranText\QuranWordMap;

/*
| ADR 0093 review sheet: keys, verse references and word positions only. The placeholder words below must never appear in
| the output, which proves the sheet holds no text.
*/

function wsSheet(): QuranWordsSheet
{
    return new QuranWordsSheet(new QuranWordMap([
        '1:1' => ['ت١', 'ت٢', 'ت٣'],
        '1:2' => ['ت٤', 'ت٥'],
    ]));
}

it('lists a partial row with the quoted positions of each verse and no text', function (): void {
    $sheet = wsSheet()->render([
        'hisn-al-muslim:entry-000900:standard:1' => [
            [1, 1, 2, 'status' => 'candidate', 'evidence' => 'words:exact', 'words' => [2, null]],
        ],
    ]);

    expect($sheet)
        ->toContain('## hisn-al-muslim:entry-000900:standard:1, span 1')
        ->toContain('- Verse 1:1: 3 words; quoted positions 2 to 3 (2 words)')
        ->toContain('- Verse 1:2: 2 words; quoted positions 1 to 2 (2 words)')
        ->not->toContain('ت١')
        ->not->toContain('ت٤');
});

it('lists an unmatched span with its matcher reference, and leaves out a whole-verse row', function (): void {
    $sheet = wsSheet()->render([
        'hisn-al-muslim:entry-000901:standard:1' => [[1, 2, null, 'status' => 'unmatched', 'evidence' => 'similarity:0.57']],
        'hisn-al-muslim:entry-000902:standard:1' => [[1, 1, null, 'status' => 'reviewed', 'evidence' => 'manual']],
    ]);

    expect($sheet)
        ->toContain('## hisn-al-muslim:entry-000901:standard:1, span 1')
        ->toContain('- Range: no word range (matcher reference 1:2)')
        ->toContain('- Decision: [ ] reviewed (range as shown)  [ ] stays excluded')
        ->not->toContain('entry-000902');
});

it('shows a reviewed row as decided by the developer, with its evidence, and not as a tick box', function (): void {
    $sheet = wsSheet()->render([
        'hisn-al-muslim:entry-000903:standard:1' => [
            [1, 1, null, 'status' => 'reviewed', 'evidence' => 'developer:2026-11-15', 'words' => [2, 3]],
        ],
    ]);

    expect($sheet)
        ->toContain('- Decision: reviewed by the developer (developer:2026-11-15)')
        ->not->toContain('[ ] reviewed');
});

it('says so when nothing is listed', function (): void {
    expect(wsSheet()->render([]))->toContain('No span is listed.');
});

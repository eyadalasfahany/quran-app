<?php

declare(strict_types=1);

use App\Domains\Azkar\OpenDua\StepFlattener;

/*
| Developer decision (1 Nov 2026, plan step 14 §5): a recitation step's recordings belong to its first item only, so the
| reader shows the audio once and a later item of the same step does not play the whole step. Synthetic placeholder steps.
*/

function firstItemStep(): array
{
    return [
        'type' => 'recitation',
        'speaker' => 'FIXTURE speaker',
        'recordings' => [
            ['id' => 'rec-first-item', 'reciterId' => 'reciter-0001', 'url' => 'https://example.invalid/OD-902.mp3', 'durationSeconds' => 3],
        ],
        'items' => [
            ['dua' => ['id' => 'dua-a', 'arabic' => 'FIXTURE text A — not a dhikr']],
            ['dua' => ['id' => 'dua-b', 'arabic' => 'FIXTURE text B — not a dhikr']],
            ['dua' => ['id' => 'dua-c', 'arabic' => 'FIXTURE text C — not a dhikr']],
        ],
    ];
}

it('gives the recording to the first item of a multi-item step and to no other item', function (): void {
    $flat = app(StepFlattener::class)->flatten('hisn-al-muslim:entry-000031', 30, 'standard', [firstItemStep()]);

    expect($flat->items)->toHaveCount(3)
        ->and(count($flat->items[0]->recordings))->toBe(1)
        ->and($flat->items[0]->recordings[0]['url'])->toBe('https://example.invalid/OD-902.mp3')
        ->and($flat->items[1]->recordings)->toBe([])
        ->and($flat->items[2]->recordings)->toBe([]);
});

it('still counts every recording object of the step as upstream', function (): void {
    $flat = app(StepFlattener::class)->flatten('hisn-al-muslim:entry-000031', 30, 'standard', [firstItemStep()]);

    expect($flat->recordingIds)->toBe(['rec-first-item']);
});

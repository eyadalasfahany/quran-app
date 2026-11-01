<?php

declare(strict_types=1);

/*
| ADR 0031 §11 (amended 1 Nov 2026): an excluded entry must not carry a reviewed Quran reference row. A reviewed row
| on an excluded entry means the exclusion is stale. The `--skip-blocked` production refusal is covered in SkipBlockedTest.
*/

it('keys every excluded entry by its entry key', function (): void {
    $excluded = config('azkar.excluded_entries');

    expect($excluded)->toBeArray()->not->toBeEmpty();

    foreach (array_keys($excluded) as $entryKey) {
        expect($entryKey)->toMatch('/^hisn-al-muslim:entry-\d{6}$/');
    }
});

it('has no reviewed Quran reference rows for any excluded entry', function (): void {
    $excludedKeys = array_keys(config('azkar.excluded_entries'));
    $references = config('azkar.quran_references');

    foreach ($references as $itemKey => $rows) {
        $entryKey = implode(':', array_slice(explode(':', (string) $itemKey), 0, 2));

        if (! in_array($entryKey, $excludedKeys, true)) {
            continue;
        }

        foreach ($rows as $row) {
            expect($row['status'] ?? null)->not->toBe('reviewed', 'Excluded entry '.$entryKey.' has a reviewed row ('.$itemKey.').');
        }
    }
});

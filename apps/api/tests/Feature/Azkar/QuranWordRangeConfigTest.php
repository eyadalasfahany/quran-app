<?php

declare(strict_types=1);

use App\Domains\Azkar\Services\QuranReferencePolicy;

/*
| ADR 0093 (15 Nov 2026): the reviewed partial-verse rows in config/azkar_quran_map.php parse against the word map, and
| only the three entries the developer restored hold a word range. Their keys and positions only; no text.
*/

afterEach(function (): void {
    app()->detectEnvironment(fn (): string => 'testing');
});

it('holds word ranges only for the three restored entries, and each parses against the word map', function (): void {
    $policy = app(QuranReferencePolicy::class);
    $partial = [];

    foreach (config('azkar.quran_references') as $itemKey => $rows) {
        foreach ($rows as $row) {
            if (! array_key_exists('words', $row)) {
                continue;
            }

            $partial[] = $itemKey;

            expect($policy->parse($row))->not->toBeNull('Invalid word range on '.$itemKey);
        }
    }

    expect($partial)->toBe([
        'hisn-al-muslim:entry-000050:standard:1',
        'hisn-al-muslim:entry-000235:standard:2',
        'hisn-al-muslim:entry-000236:standard:2',
    ]);
});

it('none of the restored partial entries is still excluded, and the two that quote no exact run stay excluded', function (): void {
    $excluded = array_keys(config('azkar.excluded_entries'));

    expect($excluded)->toBe(['hisn-al-muslim:entry-000206', 'hisn-al-muslim:entry-000207']);
});

it('a partial row is accepted when reviewed and blocked as a candidate in production', function (): void {
    $policy = app(QuranReferencePolicy::class);
    $reviewed = $policy->parse([2, 158, null, 'status' => 'reviewed', 'evidence' => 'test', 'words' => [1, 6]]);
    $candidate = $policy->parse([2, 158, null, 'status' => 'candidate', 'evidence' => 'words:exact', 'words' => [1, 6]]);

    app()->detectEnvironment(fn (): string => 'production');

    expect($policy->decide($reviewed))->toBe(QuranReferencePolicy::DECISION_ACCEPT)
        ->and($policy->decide($candidate))->toBe(QuranReferencePolicy::DECISION_BLOCK);
});

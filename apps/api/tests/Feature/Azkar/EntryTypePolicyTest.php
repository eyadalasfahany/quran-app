<?php

declare(strict_types=1);

use App\Domains\Azkar\Enums\AzkarEntryClass;
use App\Domains\Azkar\Services\EntryTypePolicy;

/*
| plan docs/plans/azkar-duas-split.md, step 2: only reviewed rows of config azkar_entry_types.php take effect. Candidate
| rows are listed, never applied. Every row needs a known type, a known status and evidence. No text is involved.
*/

const ETP_KEY = 'hisn-al-muslim:entry-000001';

it('applies a reviewed row as its class', function (): void {
    $plan = (new EntryTypePolicy)->resolve([
        ETP_KEY => ['type' => 'dua', 'status' => 'reviewed', 'evidence' => 'checked by developer'],
    ]);

    expect($plan->types)->toBe([ETP_KEY => AzkarEntryClass::Dua])
        ->and($plan->candidates)->toBe([])
        ->and($plan->errors)->toBe([])
        ->and($plan->counts)->toBe(['dua' => ['reviewed' => 1]])
        ->and($plan->hasErrors())->toBeFalse();
});

it('never applies a candidate row and lists it as a warning', function (): void {
    $plan = (new EntryTypePolicy)->resolve([
        ETP_KEY => ['type' => 'dhikr', 'status' => 'candidate', 'evidence' => 'claude:text-rule'],
    ]);

    expect($plan->types)->toBe([])
        ->and($plan->candidates)->toBe([ETP_KEY])
        ->and($plan->errors)->toBe([])
        ->and($plan->counts)->toBe(['dhikr' => ['candidate' => 1]]);
});

it('applies reviewed rows and only lists the candidates beside them', function (): void {
    $plan = (new EntryTypePolicy)->resolve([
        'hisn-al-muslim:entry-000001' => ['type' => 'dhikr', 'status' => 'reviewed', 'evidence' => 'checked'],
        'hisn-al-muslim:entry-000002' => ['type' => 'dua', 'status' => 'candidate', 'evidence' => 'claude:text-rule'],
    ]);

    expect($plan->types)->toHaveKey('hisn-al-muslim:entry-000001')
        ->and($plan->types)->not->toHaveKey('hisn-al-muslim:entry-000002')
        ->and($plan->candidates)->toBe(['hisn-al-muslim:entry-000002'])
        ->and($plan->counts)->toBe(['dhikr' => ['reviewed' => 1], 'dua' => ['candidate' => 1]]);
});

it('reports an unknown type as an error', function (): void {
    $plan = (new EntryTypePolicy)->resolve([
        ETP_KEY => ['type' => 'prayer', 'status' => 'reviewed', 'evidence' => 'checked'],
    ]);

    expect($plan->errors)->toBe([ETP_KEY => EntryTypePolicy::REASON_UNKNOWN_TYPE])
        ->and($plan->types)->toBe([])
        ->and($plan->counts)->toBe([])
        ->and($plan->hasErrors())->toBeTrue();
});

it('reports a type with the wrong case as an error', function (): void {
    $plan = (new EntryTypePolicy)->resolve([
        ETP_KEY => ['type' => 'Dhikr', 'status' => 'candidate', 'evidence' => 'claude:text-rule'],
    ]);

    expect($plan->errors)->toBe([ETP_KEY => EntryTypePolicy::REASON_UNKNOWN_TYPE]);
});

it('reports an unknown status as an error and applies nothing', function (): void {
    $plan = (new EntryTypePolicy)->resolve([
        ETP_KEY => ['type' => 'dhikr', 'status' => 'approved', 'evidence' => 'checked'],
    ]);

    expect($plan->errors)->toBe([ETP_KEY => EntryTypePolicy::REASON_UNKNOWN_STATUS])
        ->and($plan->types)->toBe([])
        ->and($plan->candidates)->toBe([]);
});

it('reports a row without evidence as an error', function (): void {
    $plan = (new EntryTypePolicy)->resolve([
        ETP_KEY => ['type' => 'dhikr', 'status' => 'reviewed'],
    ]);

    expect($plan->errors)->toBe([ETP_KEY => EntryTypePolicy::REASON_MISSING_EVIDENCE])
        ->and($plan->types)->toBe([]);
});

it('reports blank evidence as an error', function (): void {
    $plan = (new EntryTypePolicy)->resolve([
        ETP_KEY => ['type' => 'dhikr', 'status' => 'candidate', 'evidence' => '   '],
    ]);

    expect($plan->errors)->toBe([ETP_KEY => EntryTypePolicy::REASON_MISSING_EVIDENCE]);
});

it('reports a row that is not an array as an error', function (): void {
    $plan = (new EntryTypePolicy)->resolve([ETP_KEY => 'dhikr']);

    expect($plan->errors)->toBe([ETP_KEY => EntryTypePolicy::REASON_MALFORMED_ROW]);
});

it('passes an empty config with zero counts', function (): void {
    $plan = (new EntryTypePolicy)->resolve([]);

    expect($plan->types)->toBe([])
        ->and($plan->candidates)->toBe([])
        ->and($plan->errors)->toBe([])
        ->and($plan->counts)->toBe([])
        ->and($plan->hasErrors())->toBeFalse();
});

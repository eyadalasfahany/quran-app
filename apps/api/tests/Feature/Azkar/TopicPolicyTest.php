<?php

declare(strict_types=1);

use App\Domains\Azkar\Services\TopicPolicy;

/*
| ADR 0092 decisions 1-2: only reviewed chapter rows of config azkar_topics.php take effect. A candidate is listed, never
| applied. A row names one topic or one split tag, and needs a known status and evidence. No Azkar text is involved.
*/

const TP_TOPICS = ['prayer' => ['ar' => 'FIXTURE topic', 'en' => 'FIXTURE topic'], 'travel' => ['ar' => 'FIXTURE topic', 'en' => 'FIXTURE topic']];

const TP_SPLITS = ['morning-and-evening' => ['morning-topic' => ['session' => 'morning']]];

function tpRow(array $overrides = []): array
{
    return array_merge(['topic' => 'prayer', 'status' => 'reviewed', 'evidence' => 'fixture'], $overrides);
}

it('applies a reviewed topic row to its chapter', function (): void {
    $plan = (new TopicPolicy)->resolve(TP_TOPICS, [25 => tpRow()], TP_SPLITS);

    expect($plan->topics)->toBe([25 => 'prayer'])
        ->and($plan->splits)->toBe([])
        ->and($plan->candidates)->toBe([])
        ->and($plan->errors)->toBe([])
        ->and($plan->counts)->toBe(['prayer' => ['reviewed' => 1]]);
});

it('applies a reviewed split row as the catalogue tag it names', function (): void {
    $plan = (new TopicPolicy)->resolve(TP_TOPICS, [27 => ['split' => 'morning-and-evening', 'status' => 'reviewed', 'evidence' => 'fixture']], TP_SPLITS);

    expect($plan->topics)->toBe([])
        ->and($plan->splits)->toBe([27 => 'morning-and-evening'])
        ->and($plan->errors)->toBe([]);
});

it('never applies a candidate row and lists its chapter as a warning', function (): void {
    $plan = (new TopicPolicy)->resolve(TP_TOPICS, [25 => tpRow(['status' => 'candidate'])], TP_SPLITS);

    expect($plan->topics)->toBe([])
        ->and($plan->candidates)->toBe([25])
        ->and($plan->errors)->toBe([])
        ->and($plan->counts)->toBe(['prayer' => ['candidate' => 1]]);
});

it('reports an unknown topic id as an error and does not apply the row', function (): void {
    $plan = (new TopicPolicy)->resolve(TP_TOPICS, [25 => tpRow(['topic' => 'not-a-topic'])], TP_SPLITS);

    expect($plan->topics)->toBe([])
        ->and($plan->errors)->toBe(['25' => TopicPolicy::REASON_UNKNOWN_TOPIC])
        ->and($plan->counts)->toBe([]);
});

it('reports an unknown split tag as an error and does not apply the row', function (): void {
    $plan = (new TopicPolicy)->resolve(TP_TOPICS, [27 => ['split' => 'not-a-tag', 'status' => 'reviewed', 'evidence' => 'fixture']], TP_SPLITS);

    expect($plan->splits)->toBe([])
        ->and($plan->errors)->toBe(['27' => TopicPolicy::REASON_UNKNOWN_SPLIT]);
});

it('reports a row that names both a topic and a split, or neither, as malformed', function (): void {
    $plan = (new TopicPolicy)->resolve(TP_TOPICS, [
        25 => tpRow(['split' => 'morning-and-evening']),
        26 => ['status' => 'reviewed', 'evidence' => 'fixture'],
    ], TP_SPLITS);

    expect($plan->topics)->toBe([])
        ->and($plan->errors)->toBe(['25' => TopicPolicy::REASON_MALFORMED_ROW, '26' => TopicPolicy::REASON_MALFORMED_ROW]);
});

it('reports an unknown status and a missing evidence as errors, whatever the other fields say', function (): void {
    $plan = (new TopicPolicy)->resolve(TP_TOPICS, [
        25 => tpRow(['status' => 'granted']),
        26 => tpRow(['evidence' => '  ']),
    ], TP_SPLITS);

    expect($plan->topics)->toBe([])
        ->and($plan->errors)->toBe(['25' => TopicPolicy::REASON_UNKNOWN_STATUS, '26' => TopicPolicy::REASON_MISSING_EVIDENCE]);
});

it('reports a chapter key that is not a positive number, and a row that is not an array', function (): void {
    $plan = (new TopicPolicy)->resolve(TP_TOPICS, ['x' => tpRow(), 0 => tpRow(), 28 => 'prayer'], TP_SPLITS);

    expect($plan->topics)->toBe([])
        ->and($plan->errors)->toBe(['x' => TopicPolicy::REASON_MALFORMED_CHAPTER, '0' => TopicPolicy::REASON_MALFORMED_CHAPTER, '28' => TopicPolicy::REASON_MALFORMED_ROW]);
});

it('gives an empty plan for empty config', function (): void {
    $plan = (new TopicPolicy)->resolve(TP_TOPICS, [], TP_SPLITS);

    expect($plan->topics)->toBe([])
        ->and($plan->splits)->toBe([])
        ->and($plan->candidates)->toBe([])
        ->and($plan->errors)->toBe([])
        ->and($plan->counts)->toBe([]);
});

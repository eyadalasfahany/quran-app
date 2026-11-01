<?php

declare(strict_types=1);

use App\Domains\Azkar\Services\SourceComparer;

/*
| ADR 0031 §12. Placeholder texts only. The comparer reports counts, statuses and positions, never text.
*/

function scOpenDua(array $texts, string $number, ?int $times = null): array
{
    $items = array_map(fn (string $text): array => ['dua' => ['id' => 'd', 'arabic' => $text]] + ($times === null ? [] : ['times' => $times]), $texts);

    return ['sourceReference' => $number, 'variations' => [['id' => 'standard', 'steps' => [['type' => 'recitation', 'items' => $items]]]]];
}

function scHisn(string $text, int $id, int $repeat): array
{
    return ['id' => (string) $id, 'variations' => [['id' => 'standard', 'steps' => [['type' => 'recitation', 'items' => [['dua' => ['id' => 'h', 'arabic' => $text], 'times' => $repeat]]]]]]];
}

it('classifies identical, wrapper-equal, different and single-side numbers, and REPEAT matches and mismatches', function (): void {
    $openDua = ['entries' => [
        scOpenDua(['FIXTURE alpha'], '1', 3),
        scOpenDua(['FIXTURE beta'], '2'),
        scOpenDua(['FIXTURE gamma'], '3', 2),
        scOpenDua(['FIXTURE delta one', 'FIXTURE delta two'], '4'),
        ['sourceReference' => '5', 'variations' => [['id' => 'standard', 'steps' => [['type' => 'instruction', 'arabic' => 'x']]]]],
        scOpenDua(['FIXTURE only in opendua'], '6'),
    ]];
    $hisn = ['entries' => [
        scHisn('FIXTURE alpha', 1, 3),
        scHisn('(( FIXTURE beta ).', 2, 1),
        scHisn('FIXTURE different', 3, 1),
        scHisn('FIXTURE delta one', 4, 1),
        scHisn('FIXTURE text five', 5, 1),
        scHisn('FIXTURE only in hisnmuslim', 7, 1),
    ]];

    $result = app(SourceComparer::class)->compare($openDua, $hisn);
    $summary = $result['summary'];

    expect($summary['numbers_in_both'])->toBe(5)
        ->and($summary['only_opendua'])->toBe(1)
        ->and($summary['only_hisnmuslim'])->toBe(1)
        ->and($summary['arabic_identical'])->toBe(1)
        ->and($summary['arabic_equal_after_unwrapping'])->toBe(1)
        ->and($summary['arabic_different'])->toBe(2)
        ->and($summary['arabic_no_recitation'])->toBe(1)
        ->and($summary['arabic_multi_item'])->toBe(1)
        ->and($summary['repeat_match'])->toBe(1)
        ->and($summary['repeat_mismatch'])->toBe(1)
        ->and($summary['repeat_opendua_missing'])->toBe(3);
});

it('reports a different text by number, code point position and lengths, never by text', function (): void {
    $result = app(SourceComparer::class)->compare(
        ['entries' => [scOpenDua(['FIXTURE abcdef'], '9')]],
        ['entries' => [scHisn('FIXTURE abXdef', 9, 1)]],
    );

    $row = collect($result['differing'])->firstWhere('number', '9');

    expect($row)->toMatchArray([
        'status' => 'different',
        'first_difference_codepoint' => 10,
        'length_opendua_codepoints' => 14,
        'length_hisnmuslim_codepoints' => 14,
    ])
        ->and(json_encode($result))->not->toContain('FIXTURE');
});

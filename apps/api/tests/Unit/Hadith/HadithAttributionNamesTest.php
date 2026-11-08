<?php

declare(strict_types=1);

use App\Domains\Hadith\Services\HadithAttributionNames;

const HADITH_EXPL_COLLECTIONS = ['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah', 'malik', 'nawawi40', 'qudsi40', 'shahwaliullah40'];

it('names the collection an attribution gives', function (string $attribution, array $expected): void {
    expect(HadithAttributionNames::collections($attribution, HADITH_EXPL_COLLECTIONS))->toBe($expected);
})->with([
    'a single name' => ['نص تجريبي — رواه البخاري', ['bukhari']],
    'two names' => ['نص تجريبي — رواه مسلم والترمذي', ['muslim', 'tirmidhi']],
    'the agreed phrase names both Bukhari and Muslim' => ['نص تجريبي — متفق عليه', ['bukhari', 'muslim']],
    'alif with hamza folds to bare alif' => ['نص تجريبي — أبو داود', ['abudawud']],
    'bare alif matches the hamza form' => ['نص تجريبي — ابو داود', ['abudawud']],
    'ta marbuta folds to ha' => ['نص تجريبي — ابن ماجة', ['ibnmajah']],
    'a name inside a longer word is not a name' => ['نص تجريبي — مسلمون', []],
    'no known name' => ['نص تجريبي — ليس اسمًا', []],
    'the forty-hadith collections have no name' => ['نص تجريبي — الأربعين النووية', []],
]);

it('returns the names in configuration order and only for configured collections', function (): void {
    expect(HadithAttributionNames::collections('نص تجريبي — متفق عليه', ['muslim']))->toBe(['muslim'])
        ->and(HadithAttributionNames::collections('نص تجريبي — متفق عليه', ['muslim', 'bukhari']))->toBe(['muslim', 'bukhari']);
});

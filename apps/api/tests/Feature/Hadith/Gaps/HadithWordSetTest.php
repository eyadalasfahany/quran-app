<?php

declare(strict_types=1);

use App\Domains\Hadith\Overlay\HadithWordSet;

/*
| The word-set text check (ADR 0076 §5, brief 8.5.1), placeholder Arabic strings only. For comparison only; never stored.
*/

it('folds alef forms, alef maqsura and teh marbuta', function (): void {
    expect(HadithWordSet::of('أحمد إبراهيم آمنة ى ة'))->toEqual(HadithWordSet::of('احمد ابراهيم امنة ي ه'));
});

it('removes diacritics, tatweel and bidi marks before comparing', function (): void {
    expect(HadithWordSet::of("كَتَبَ\u{200F}ـ"))->toEqual(HadithWordSet::of('كتب'));
});

it('drops words of fewer than three characters and Latin text', function (): void {
    expect(HadithWordSet::of('من في FIXTURE كتاب'))->toEqual(['كتاب' => true]);
});

it('removes PageV and ms tokens', function (): void {
    expect(HadithWordSet::of('كتاب PageV01P001 ms12'))->toEqual(['كتاب' => true]);
});

it('gives 0.0 for empty sets and 1.0 for an identical set', function (): void {
    $set = ['كتاب' => true, 'حديث' => true];

    expect(HadithWordSet::jaccard([], $set))->toBe(0.0)
        ->and(HadithWordSet::jaccard($set, []))->toBe(0.0)
        ->and(HadithWordSet::jaccard($set, $set))->toBe(1.0)
        ->and(HadithWordSet::containment([], $set))->toBe(0.0)
        ->and(HadithWordSet::containment($set, $set))->toBe(1.0);
});

it('computes jaccard and containment on the shared words', function (): void {
    $first = ['كتاب' => true, 'حديث' => true];
    $second = ['كتاب' => true, 'نص' => true];

    expect(HadithWordSet::jaccard($first, $second))->toBe(1 / 3)
        ->and(HadithWordSet::containment($first, $second))->toBe(0.5);
});

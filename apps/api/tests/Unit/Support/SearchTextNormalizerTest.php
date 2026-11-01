<?php

declare(strict_types=1);

use App\Support\QuranText\SearchTextNormalizer;

it('removes harakat and tatweel, unifies alef forms, alef maksura and ta marbuta (spec §7)', function (string $input, string $expected): void {
    expect((new SearchTextNormalizer)->normalize($input))->toBe($expected);
})->with([
    'harakat and ta marbuta' => ['مَدْرَسَة', 'مدرسه'],
    'alef with hamza above' => ['أَحْمَد', 'احمد'],
    'alef with hamza below' => ['إِبْرَاهِيم', 'ابراهيم'],
    'alef maddah' => ['آمَن', 'امن'],
    'alef maksura to ya' => ['على', 'علي'],
    'tatweel removed' => ['مـدرسة', 'مدرسه'],
    'annotation marks removed' => ["كتاب\u{06D6}", 'كتاب'],
]);

it('collapses whitespace runs and trims the ends, for the search form only', function (): void {
    expect((new SearchTextNormalizer)->normalize("  كتاب \n  جديد  "))->toBe('كتاب جديد');
});

it('is idempotent', function (): void {
    $normalizer = new SearchTextNormalizer;
    $once = $normalizer->normalize('أَحْمَدُ مَدْرَسَةٌ على');

    expect($normalizer->normalize($once))->toBe($once);
});

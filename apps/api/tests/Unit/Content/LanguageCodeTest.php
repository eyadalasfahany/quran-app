<?php

declare(strict_types=1);

use App\Domains\Content\Enums\LanguageCode;

it('maps every quran foundation language name', function (string $name, LanguageCode $code): void {
    expect(LanguageCode::fromQfName($name))->toBe($code);
})->with([
    'arabic' => ['arabic', LanguageCode::Arabic],
    'english' => ['english', LanguageCode::English],
    'urdu' => ['urdu', LanguageCode::Urdu],
    'persian' => ['persian', LanguageCode::Persian],
    'indonesian' => ['indonesian', LanguageCode::Indonesian],
    'turkish' => ['turkish', LanguageCode::Turkish],
    'french' => ['french', LanguageCode::French],
    'bengali' => ['bengali', LanguageCode::Bengali],
    'spanish' => ['spanish', LanguageCode::Spanish],
    'russian' => ['russian', LanguageCode::Russian],
    'german' => ['german', LanguageCode::German],
    'malay' => ['malay', LanguageCode::Malay],
    'chinese' => ['chinese', LanguageCode::Chinese],
]);

it('returns null for an unknown language name', function (): void {
    expect(LanguageCode::fromQfName('swahili'))->toBeNull();
});

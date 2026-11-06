<?php

declare(strict_types=1);

use App\Domains\Hadith\Exceptions\HadithPinException;
use App\Domains\Hadith\Sources\PinnedFileVerifier;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';

it('refuses a file whose SHA-256 differs from config', function (): void {
    $files = hadithFixtureFiles();
    $pins = array_map(fn (string $bytes): string => hash('sha256', $bytes), $files);
    $pins['editions.json'] = hash('sha256', 'FIXTURE A');
    hadithSetPins($pins);

    expect(fn () => app(PinnedFileVerifier::class)->verify('editions.json', 'FIXTURE B'))
        ->toThrow(HadithPinException::class, 'do not match');
});

it('accepts matching bytes', function (): void {
    $files = hadithFixtureFiles();
    hadithPinFixtures($files);

    app(PinnedFileVerifier::class)->verify('editions.json', $files['editions.json']);

    expect(app(PinnedFileVerifier::class)->matches('editions.json', $files['editions.json']))->toBeTrue();
});

it('refuses a null pin unconditionally', function (): void {
    $files = hadithFixtureFiles();
    $pins = array_fill_keys(array_keys($files), null);
    hadithSetPins($pins);
    $verifier = app(PinnedFileVerifier::class);

    expect(fn () => $verifier->verify('editions.json', $files['editions.json']))
        ->toThrow(HadithPinException::class, 'not recorded');
    expect($verifier->matches('editions.json', $files['editions.json']))->toBeFalse();
    expect(fn () => $verifier->assertAllRecorded())->toThrow(HadithPinException::class);

    try {
        $verifier->assertAllRecorded();
    } catch (HadithPinException $exception) {
        foreach (array_keys($files) as $path) {
            expect($exception->getMessage())->toContain($path);
        }
    }
});

it('refuses a path that is not a pinned file', function (): void {
    $files = hadithFixtureFiles();
    hadithPinFixtures($files);

    expect(fn () => app(PinnedFileVerifier::class)->verify('editions/ara-bukhari1.json', 'FIXTURE'))
        ->toThrow(HadithPinException::class);
    expect(fn () => app(PinnedFileVerifier::class)->expected('info.min.json'))
        ->toThrow(HadithPinException::class);
});

<?php

declare(strict_types=1);

use App\Domains\Azkar\Contracts\HadithReferenceSource;
use App\Domains\Azkar\Sources\DorarHadithReferenceSource;
use App\Domains\Azkar\Sources\NullHadithReferenceSource;

beforeEach(function (): void {
    config()->set('services.dorar.base_url', 'https://dorar.test/api');
    config()->set('services.dorar.token', 'test-dorar-token');
    config()->set('services.dorar.enabled', true);
});

it('binds the null source when no token is configured', function (): void {
    config()->set('services.dorar.token', '');

    expect(app(HadithReferenceSource::class))->toBeInstanceOf(NullHadithReferenceSource::class)
        ->and(app(HadithReferenceSource::class)->isAvailable())->toBeFalse();
});

it('binds the null source when a token is set but Dorar is disabled', function (): void {
    config()->set('services.dorar.enabled', false);

    expect(app(HadithReferenceSource::class))->toBeInstanceOf(NullHadithReferenceSource::class);
});

it('binds the Dorar source when the token is set and Dorar is enabled', function (): void {
    expect(app(HadithReferenceSource::class))->toBeInstanceOf(DorarHadithReferenceSource::class)
        ->and(app(HadithReferenceSource::class)->isAvailable())->toBeTrue();
});

<?php

declare(strict_types=1);

use App\Domains\Azkar\Contracts\HadithReferenceSource;
use App\Domains\Azkar\Data\HadithReferenceQuery;
use App\Domains\Azkar\Sources\DorarHadithReferenceSource;
use App\Domains\Azkar\Sources\NullHadithReferenceSource;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    config()->set('services.dorar.base_url', 'https://dorar.test/api');
    config()->set('services.dorar.token', 'test-dorar-token');
});

it('binds the null source when no token is configured', function (): void {
    config()->set('services.dorar.token', '');

    expect(app(HadithReferenceSource::class))->toBeInstanceOf(NullHadithReferenceSource::class)
        ->and(app(HadithReferenceSource::class)->isAvailable())->toBeFalse();
});

it('binds the Dorar source when the token is set and Dorar is enabled', function (): void {
    expect(app(HadithReferenceSource::class))->toBeInstanceOf(DorarHadithReferenceSource::class)
        ->and(app(HadithReferenceSource::class)->isAvailable())->toBeTrue();
});

it('binds the null source when the base URL is empty, even with a token set (ADR 0031 §2)', function (): void {
    config()->set('services.dorar.base_url', '');

    $source = app(HadithReferenceSource::class);

    expect($source)->toBeInstanceOf(NullHadithReferenceSource::class)
        ->and($source->isAvailable())->toBeFalse()
        ->and($source->lookup(new HadithReferenceQuery('test'))->references)->toBe([]);

    Http::assertNothingSent();
});

it('makes no request when neither base URL nor token is set', function (): void {
    config()->set('services.dorar.base_url', '');
    config()->set('services.dorar.token', '');
    Http::preventStrayRequests();

    expect(app(HadithReferenceSource::class))->toBeInstanceOf(NullHadithReferenceSource::class);

    Http::assertNothingSent();
});

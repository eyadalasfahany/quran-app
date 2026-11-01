<?php

declare(strict_types=1);

use App\Domains\Azkar\Contracts\HadithReferenceSource;
use App\Domains\Azkar\Data\HadithReferenceQuery;
use App\Domains\Azkar\Data\HadithReferenceResult;
use App\Integrations\Dorar\DorarMappingUnavailableException;
use App\Integrations\Dorar\DorarResponseMapper;
use Illuminate\Support\Facades\Http;

beforeEach(function (): void {
    Http::preventStrayRequests();

    config()->set('services.dorar.base_url', 'https://dorar.test/api');
    config()->set('services.dorar.token', 'test-dorar-token');
    config()->set('services.dorar.enabled', true);
});

it('throws the mapping-unavailable exception until the Dorar schema is documented', function (): void {
    expect(fn () => app(HadithReferenceSource::class)->lookup(new HadithReferenceQuery('test')))
        ->toThrow(DorarMappingUnavailableException::class);

    Http::assertNothingSent();
});

it('the mapper throws the mapping-unavailable exception pointing at the brief', function (): void {
    expect(fn () => app(DorarResponseMapper::class)->map('test', null))
        ->toThrow(DorarMappingUnavailableException::class, 'docs/plans/phase-6/step-09-dorar-adapter.md');
});

it('the null source returns an empty result from the none provider', function (): void {
    config()->set('services.dorar.token', '');

    $result = app(HadithReferenceSource::class)->lookup(new HadithReferenceQuery('test'));

    expect($result->references)->toBe([])
        ->and($result->provider)->toBe(HadithReferenceResult::PROVIDER_NONE);

    Http::assertNothingSent();
});

<?php

declare(strict_types=1);

use App\Integrations\Dorar\DorarClient;
use App\Integrations\Dorar\DorarRateLimitedException;
use App\Integrations\Dorar\DorarRequestException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

const DORAR_TEST_TOKEN = 'test-dorar-token';

beforeEach(function (): void {
    Http::preventStrayRequests();

    config()->set('services.dorar.base_url', 'https://dorar.test/api');
    config()->set('services.dorar.token', DORAR_TEST_TOKEN);
    config()->set('services.dorar.token_header', 'Authorization');
    config()->set('services.dorar.token_prefix', 'Bearer ');
    config()->set('services.dorar.timeout_seconds', 5);
    config()->set('services.dorar.max_requests_per_minute', 30);
    config()->set('services.dorar.cache_ttl_seconds', 0);
});

it('sends the configured token header, prefix and a Taybah user agent', function (): void {
    Http::fake(['https://dorar.test/api/*' => Http::response(['ok' => true])]);

    app(DorarClient::class)->get('hadith', ['page' => 1]);

    Http::assertSent(function (Request $request): bool {
        return $request->url() === 'https://dorar.test/api/hadith?page=1'
            && $request->hasHeader('Authorization', 'Bearer '.DORAR_TEST_TOKEN)
            && $request->hasHeader('User-Agent', 'Taybah/1.0');
    });
});

it('uses a configured token header and prefix', function (): void {
    config()->set('services.dorar.token_header', 'X-Api-Key');
    config()->set('services.dorar.token_prefix', '');
    Http::fake(['https://dorar.test/api/*' => Http::response(['ok' => true])]);

    app(DorarClient::class)->get('hadith');

    Http::assertSent(fn (Request $request): bool => $request->hasHeader('X-Api-Key', DORAR_TEST_TOKEN));
});

it('applies the configured timeout', function (): void {
    config()->set('services.dorar.timeout_seconds', 7);
    $timeouts = [];

    Http::fake(function (Request $request, array $options) use (&$timeouts) {
        $timeouts[] = $options['timeout'] ?? null;

        return Http::response(['ok' => true]);
    });

    app(DorarClient::class)->get('hadith');

    expect($timeouts)->toBe([7]);
});

it('throws a rate-limited exception carrying Retry-After on a 429', function (): void {
    Http::fake(['https://dorar.test/api/*' => Http::response([], 429, ['Retry-After' => '12'])]);

    expect(fn () => app(DorarClient::class)->get('hadith'))
        ->toThrow(DorarRateLimitedException::class);

    try {
        app(DorarClient::class)->get('hadith');
    } catch (DorarRateLimitedException $exception) {
        expect($exception->retryAfterSeconds)->toBe(12);
    }
});

it('throws a request exception without the response body on other failures', function (): void {
    Http::fake(['https://dorar.test/api/*' => Http::response(['message' => 'rejected '.DORAR_TEST_TOKEN], 401)]);

    try {
        app(DorarClient::class)->get('hadith');
        $this->fail('Expected DorarRequestException.');
    } catch (DorarRequestException $exception) {
        expect($exception->status)->toBe(401)
            ->and($exception->getMessage())->not->toContain(DORAR_TEST_TOKEN);
    }
});

it('keeps the token out of the message when the connection fails', function (): void {
    Http::fake(function (): never {
        throw new ConnectionException('cURL error 28 Authorization: Bearer '.DORAR_TEST_TOKEN);
    });

    try {
        app(DorarClient::class)->get('hadith');
        $this->fail('Expected DorarRequestException.');
    } catch (DorarRequestException $exception) {
        expect($exception->getMessage())->toBe('Dorar could not be reached.')
            ->and($exception->getPrevious())->toBeNull();
    }
});

it('blocks the request after the per-minute limit', function (): void {
    config()->set('services.dorar.max_requests_per_minute', 30);
    Http::fake(['https://dorar.test/api/*' => Http::response(['ok' => true])]);

    $client = app(DorarClient::class);

    for ($attempt = 1; $attempt <= 30; $attempt++) {
        $client->get('hadith', ['page' => $attempt]);
    }

    expect(fn () => $client->get('hadith', ['page' => 31]))
        ->toThrow(DorarRateLimitedException::class);

    Http::assertSentCount(30);
});

it('does not cache when the TTL is zero', function (): void {
    Http::fake(['https://dorar.test/api/*' => Http::response(['ok' => true])]);

    $client = app(DorarClient::class);
    $client->get('hadith', ['page' => 1]);
    $client->get('hadith', ['page' => 1]);

    Http::assertSentCount(2);
});

it('serves a repeated query from cache within the TTL', function (): void {
    config()->set('services.dorar.cache_ttl_seconds', 300);
    Http::fake(['https://dorar.test/api/*' => Http::response(['ok' => true])]);

    $client = app(DorarClient::class);
    $first = $client->get('hadith', ['page' => 1]);
    $second = $client->get('hadith', ['page' => 1]);
    $other = $client->get('hadith', ['page' => 2]);

    expect($first)->toBe(['ok' => true])
        ->and($second)->toBe($first)
        ->and($other)->toBe(['ok' => true]);

    Http::assertSentCount(2);
});

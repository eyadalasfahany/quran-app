<?php

declare(strict_types=1);

use App\Integrations\QuranFoundation\OAuthTokenProvider;
use App\Integrations\QuranFoundation\QuranFoundationException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Support\QuranFoundationFixture;

beforeEach(function (): void {
    Http::preventStrayRequests();

    config()->set('quran.qf.environment', 'prelive');
    config()->set('quran.qf.client_id', 'test-client-id');
    config()->set('quran.qf.client_secret', 'test-client-secret');
    config()->set('quran.qf.contact_email', 'ops@taybah.test');

    QuranFoundationFixture::forgetBindings();
    Cache::flush();
});

it('requests a client-credentials token and reuses the cached value', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
    ]);

    $provider = app(OAuthTokenProvider::class);

    expect($provider->token())->toBe('prelive-access-token')
        ->and($provider->token())->toBe('prelive-access-token')
        ->and(Cache::get('qf.oauth.prelive'))->toBe('prelive-access-token');

    Http::assertSentCount(1);
    Http::assertSent(function (Request $request): bool {
        parse_str((string) $request->body(), $body);

        return $request->method() === 'POST'
            && $request->url() === 'https://prelive-oauth2.quran.foundation/oauth2/token'
            && $request->hasHeader('Authorization', 'Basic '.base64_encode('test-client-id:test-client-secret'))
            && $request->hasHeader('User-Agent', 'Taybah/1.0 (+mailto:ops@taybah.test)')
            && $body === [
                'grant_type' => 'client_credentials',
                'scope' => 'content',
            ];
    });
});

it('refreshes the token after expiry minus the refresh margin', function (): void {
    config()->set('quran.qf.token_refresh_margin', 60);
    QuranFoundationFixture::forgetBindings();
    $this->freezeTime();

    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::sequence()
            ->push(['access_token' => 'token-one', 'expires_in' => 120, 'token_type' => 'bearer'])
            ->push(['access_token' => 'token-two', 'expires_in' => 120, 'token_type' => 'bearer']),
    ]);

    $provider = app(OAuthTokenProvider::class);

    expect($provider->token())->toBe('token-one');

    $this->travel(59)->seconds();

    expect($provider->token())->toBe('token-one');

    $this->travel(1)->seconds();

    expect($provider->token())->toBe('token-two');
    Http::assertSentCount(2);
});

it('keeps prelive and production tokens on different cache keys and hosts', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response([
            'access_token' => 'prelive-access-token',
            'expires_in' => 3599,
            'token_type' => 'bearer',
        ]),
        'https://oauth2.quran.foundation/oauth2/token' => Http::response([
            'access_token' => 'production-access-token',
            'expires_in' => 3599,
            'token_type' => 'bearer',
        ]),
    ]);

    expect(app(OAuthTokenProvider::class)->token())->toBe('prelive-access-token');

    config()->set('quran.qf.environment', 'production');
    config()->set('quran.qf.client_id', 'prod-client-id');
    config()->set('quran.qf.client_secret', 'prod-client-secret');
    QuranFoundationFixture::forgetBindings();

    expect(app(OAuthTokenProvider::class)->token())->toBe('production-access-token')
        ->and(Cache::get('qf.oauth.prelive'))->toBe('prelive-access-token')
        ->and(Cache::get('qf.oauth.production'))->toBe('production-access-token');

    Http::assertSent(function (Request $request): bool {
        return $request->url() === 'https://prelive-oauth2.quran.foundation/oauth2/token'
            && $request->hasHeader('Authorization', 'Basic '.base64_encode('test-client-id:test-client-secret'));
    });
    Http::assertSent(function (Request $request): bool {
        return $request->url() === 'https://oauth2.quran.foundation/oauth2/token'
            && $request->hasHeader('Authorization', 'Basic '.base64_encode('prod-client-id:prod-client-secret'));
    });
});

it('rejects missing credentials before any http call', function (): void {
    config()->set('quran.qf.client_id', '');
    config()->set('quran.qf.client_secret', '');
    QuranFoundationFixture::forgetBindings();

    expect(fn () => app(OAuthTokenProvider::class)->token())
        ->toThrow(QuranFoundationException::class, 'Quran Foundation client id and client secret are required.');

    Http::assertNothingSent();
});

it('rejects an unknown environment before any http call', function (): void {
    config()->set('quran.qf.environment', 'staging');
    QuranFoundationFixture::forgetBindings();

    expect(fn () => app(OAuthTokenProvider::class)->token())
        ->toThrow(QuranFoundationException::class, 'QF environment [staging] must be prelive or production.');

    Http::assertNothingSent();
});

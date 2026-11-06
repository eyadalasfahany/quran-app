<?php

declare(strict_types=1);

use App\Integrations\HadithApiFawaz\HadithApiFawazBodyException;
use App\Integrations\HadithApiFawaz\HadithApiFawazClient;
use App\Integrations\HadithApiFawaz\HadithApiFawazConfig;
use App\Integrations\HadithApiFawaz\HadithApiFawazConfigException;
use App\Integrations\HadithApiFawaz\HadithApiFawazNotFoundException;
use App\Integrations\HadithApiFawaz\HadithApiFawazPathException;
use App\Integrations\HadithApiFawaz\HadithApiFawazRequestException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';

/*
| Transport only (ADR 0042 §3). Placeholder bytes, no live network: every request is faked.
*/

beforeEach(function (): void {
    Http::preventStrayRequests();
    config(['hadith.download.retry_delay_ms' => 0, 'quran.qf.contact_email' => '']);
    hadithReload();
});

it('builds URLs from the pinned commit and never uses @1', function (): void {
    Http::fake([hadithCdnUrl('editions.json') => Http::response('FIXTURE body')]);

    $client = app(HadithApiFawazClient::class);
    $url = $client->url('editions.json');

    expect($url)->toBe('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@df57907be35291c91ad6a6691180e22ca9920784/editions.json')
        ->and($url)->not->toContain('@1')
        ->and($client->fetch('editions.json'))->toBe('FIXTURE body');

    Http::assertSent(fn ($request): bool => $request->url() === $url);
});

it('refuses a path that is not a pinned file and sends no request', function (): void {
    $client = app(HadithApiFawazClient::class);

    foreach (['editions/ara-bukhari1.json', 'editions/eng-bukhari.json', '../info.json', 'info.min.json'] as $path) {
        expect(fn () => $client->fetch($path))->toThrow(HadithApiFawazPathException::class);
        expect(fn () => $client->url($path))->toThrow(HadithApiFawazPathException::class);
    }

    Http::assertNothingSent();
});

it('sends the Taybah user agent with the contact email', function (): void {
    Http::fake([hadithCdnUrl('info.json') => Http::response('FIXTURE body')]);

    config(['quran.qf.contact_email' => 'fixture@example.test']);
    hadithReload();
    app(HadithApiFawazClient::class)->fetch('info.json');

    Http::assertSent(fn ($request): bool => $request->header('User-Agent')[0] === 'Taybah/1.0 (+mailto:fixture@example.test)');
});

it('sends the plain Taybah user agent when the contact email is empty', function (): void {
    Http::fake([hadithCdnUrl('info.json') => Http::response('FIXTURE body')]);

    app(HadithApiFawazClient::class)->fetch('info.json');

    Http::assertSent(fn ($request): bool => $request->header('User-Agent')[0] === 'Taybah/1.0');
});

it('retries on 503 and then succeeds', function (): void {
    Http::fake([
        hadithCdnUrl('editions.json') => Http::sequence()
            ->pushStatus(503)
            ->pushStatus(503)
            ->push('FIXTURE body'),
    ]);

    expect(app(HadithApiFawazClient::class)->fetch('editions.json'))->toBe('FIXTURE body');

    Http::assertSentCount(3);
});

it('retries on a connection error', function (): void {
    $calls = 0;

    Http::fake([
        hadithCdnUrl('editions.json') => function () use (&$calls) {
            $calls++;

            if ($calls === 1) {
                throw new ConnectionException('FIXTURE connection');
            }

            return Http::response('FIXTURE body');
        },
    ]);

    expect(app(HadithApiFawazClient::class)->fetch('editions.json'))->toBe('FIXTURE body');
    expect($calls)->toBe(2);
});

it('retries on 429 and fails after the last try with the status', function (): void {
    Http::fake([hadithCdnUrl('editions.json') => Http::response('', 429)]);

    try {
        app(HadithApiFawazClient::class)->fetch('editions.json');
        $this->fail('Expected a request exception.');
    } catch (HadithApiFawazRequestException $exception) {
        expect($exception->status)->toBe(429)
            ->and($exception->getMessage())->toBe('The source answered HTTP 429 for [editions.json].');
    }

    Http::assertSentCount(3);
});

it('does not retry a 404 and reports the missing path', function (): void {
    Http::fake([hadithCdnUrl('editions/ara-bukhari.json') => Http::response('', 404)]);

    expect(fn () => app(HadithApiFawazClient::class)->fetch('editions/ara-bukhari.json'))
        ->toThrow(HadithApiFawazNotFoundException::class, 'editions/ara-bukhari.json');

    Http::assertSentCount(1);
});

it('does not retry another 4xx', function (): void {
    Http::fake([hadithCdnUrl('editions.json') => Http::response('', 403)]);

    expect(fn () => app(HadithApiFawazClient::class)->fetch('editions.json'))
        ->toThrow(HadithApiFawazRequestException::class);

    Http::assertSentCount(1);
});

it('refuses an oversized body', function (): void {
    config(['hadith.download.max_bytes' => 10]);
    hadithReload();
    Http::fake([hadithCdnUrl('editions.json') => Http::response('ABCDEFGHIJK')]);

    expect(fn () => app(HadithApiFawazClient::class)->fetch('editions.json'))
        ->toThrow(HadithApiFawazBodyException::class);
});

it('refuses a truncated body', function (): void {
    Http::fake([hadithCdnUrl('editions.json') => Http::response('FIXTURE body', 200, ['Content-Length' => '100'])]);

    expect(fn () => app(HadithApiFawazClient::class)->fetch('editions.json'))
        ->toThrow(HadithApiFawazBodyException::class);
});

it('refuses an empty body', function (): void {
    Http::fake([hadithCdnUrl('editions.json') => Http::response('')]);

    expect(fn () => app(HadithApiFawazClient::class)->fetch('editions.json'))
        ->toThrow(HadithApiFawazBodyException::class);
});

it('rejects a commit that is not 40 hex characters', function (): void {
    config(['hadith.commit' => '1']);

    expect(fn () => HadithApiFawazConfig::fromConfig())->toThrow(HadithApiFawazConfigException::class);
});

it('rejects a base URL that carries a revision', function (): void {
    config(['hadith.cdn_base' => 'https://cdn.example.test/x@1']);

    expect(fn () => HadithApiFawazConfig::fromConfig())->toThrow(HadithApiFawazConfigException::class);
});

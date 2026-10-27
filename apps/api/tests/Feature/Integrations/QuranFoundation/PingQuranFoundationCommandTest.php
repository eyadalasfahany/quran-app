<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Artisan;
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

it('prints the environment and counts without secrets or record text', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::sequence()
            ->push(QuranFoundationFixture::load('sync-page-1.json'))
            ->push(QuranFoundationFixture::load('sync-page-2.json'))
            ->push(QuranFoundationFixture::load('snapshot.json')),
    ]);

    $status = Artisan::call('qf:ping');

    expect($status)->toBe(0)
        ->and(Artisan::output())->toBe("environment: prelive\nhttp: 200\nmutations: 2\nsnapshot_records: 3\n")
        ->and(Artisan::output())->not->toContain('prelive-access-token')
        ->and(Artisan::output())->not->toContain('test-client-id')
        ->and(Artisan::output())->not->toContain('test-client-secret')
        ->and(Artisan::output())->not->toContain('do-not-print-this-ayah')
        ->and(Artisan::output())->not->toContain('sync-token-page-1');
});

it('prints the http status when the sync is rejected and omits the token', function (): void {
    Http::fake([
        'https://prelive-oauth2.quran.foundation/oauth2/token' => Http::response(QuranFoundationFixture::load('token.json')),
        'https://apis-prelive.quran.foundation/content/*' => Http::response(QuranFoundationFixture::load('error-unprocessable.json'), 422),
    ]);

    $status = Artisan::call('qf:ping');

    expect($status)->toBe(1)
        ->and(Artisan::output())->toBe("environment: prelive\nhttp: 422\nmutations: 0\nsnapshot_records: 0\n")
        ->and(Artisan::output())->not->toContain('prelive-access-token')
        ->and(Artisan::output())->not->toContain('test-client-id')
        ->and(Artisan::output())->not->toContain('resources is required');
});

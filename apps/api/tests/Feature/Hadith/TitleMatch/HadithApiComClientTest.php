<?php

declare(strict_types=1);

use App\Integrations\HadithApiCom\HadithApiComClient;
use App\Integrations\HadithApiCom\HadithApiComConfig;
use App\Integrations\HadithApiCom\HadithApiComConfigException;
use App\Integrations\HadithApiCom\HadithApiComException;
use App\Integrations\HadithApiCom\HadithApiComRequestException;
use App\Integrations\HadithApiCom\HadithApiComShapeException;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

require_once __DIR__.'/../Support/HadithTitleMatchFixtures.php';

/*
| The dev-only hadithapi.com client (ADR 0042 §4a). Faked HTTP with a placeholder key; the key must never reach a message, a
| previous exception, a string cast of an exception or a log.
*/

const HADITH_MATCH_KEY = 'FIXTURE-KEY';

beforeEach(function (): void {
    Http::preventStrayRequests();
    config([
        'hadith.api_key' => HADITH_MATCH_KEY,
        'hadith.title_match.retry_delay_ms' => 0,
        'hadith.title_match.request_gap_ms' => 0,
        'hadith.title_match.max_pages' => 2000,
    ]);
    hadithMatchReload();
});

afterEach(function (): void {
    app()['env'] = 'testing';
    CarbonImmutable::setTestNow();
});

function hadithMatchReload(): void
{
    app()->forgetInstance(HadithApiComConfig::class);
    app()->forgetInstance(HadithApiComClient::class);
}

function hadithMatchClient(): HadithApiComClient
{
    return app(HadithApiComClient::class);
}

/**
 * The key must not appear in the message, the previous exception or the string cast of the exception.
 */
function hadithMatchAssertNoKey(Throwable $exception): void
{
    expect($exception->getMessage())->not->toContain(HADITH_MATCH_KEY)
        ->and($exception->getPrevious())->toBeNull()
        ->and((string) $exception)->not->toContain(HADITH_MATCH_KEY);
}

it('sends the key only as the apiKey query parameter', function (): void {
    Http::fake(['hadithapi.com/api/*' => Http::response(['chapters' => []])]);

    hadithMatchClient()->chapters('sahih-bukhari');

    Http::assertSent(function (Request $request): bool {
        $headers = implode(' ', array_map(fn (array $values): string => implode(' ', $values), $request->headers()));

        return str_contains($request->url(), 'apiKey='.HADITH_MATCH_KEY)
            && ! str_contains($headers, HADITH_MATCH_KEY)
            && $request->body() === '';
    });
});

it('reads only chapter ids and Arabic titles, and only hadith numbers and chapter ids', function (): void {
    Http::fake([
        'hadithapi.com/api/sahih-bukhari/chapters*' => Http::response(['chapters' => [
            ['id' => 7, 'chapterArabic' => 'FIXTURE chapter title', 'extra' => 'FIXTURE text 7', 'hadiths' => ['FIXTURE text 8']],
        ]]),
        'hadithapi.com/api/hadiths*' => Http::response(['hadiths' => ['data' => [
            ['hadithNumber' => '1', 'chapterId' => 7, 'hadithEnglish' => 'FIXTURE text 1', 'grades' => ['FIXTURE grade']],
        ], 'last_page' => 1]]),
    ]);

    $chapter = hadithMatchClient()->chapters('sahih-bukhari')[0];
    $ref = hadithMatchClient()->hadithRefs('sahih-bukhari')[0];

    expect($chapter->id)->toBe('7')
        ->and($chapter->titleAr)->toBe('FIXTURE chapter title')
        ->and(get_object_vars($chapter))->toHaveCount(2)
        ->and($ref->hadithNumber)->toBe('1')
        ->and($ref->chapterId)->toBe('7')
        ->and(get_object_vars($ref))->toHaveCount(2);
});

it('follows pagination to the last page', function (): void {
    Http::fake(function (Request $request) {
        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);
        $page = (int) ($query['page'] ?? 0);

        return Http::response(['hadiths' => [
            'data' => [['hadithNumber' => (string) $page, 'chapterId' => '1']],
            'last_page' => 3,
        ]]);
    });

    $refs = hadithMatchClient()->hadithRefs('sahih-bukhari');

    expect(array_map(fn ($ref): string => $ref->hadithNumber, $refs))->toBe(['1', '2', '3'])
        ->and(Http::recorded())->toHaveCount(3);
});

it('refuses an unexpected shape, without the key in the message', function (): void {
    Http::fake(['hadithapi.com/api/*' => Http::response(['unexpected' => HADITH_MATCH_KEY])]);

    try {
        hadithMatchClient()->chapters('sahih-bukhari');
        $this->fail('expected a shape error');
    } catch (HadithApiComShapeException $exception) {
        expect($exception->getMessage())->toBe('Unexpected response shape for [chapters] page 1.');
        hadithMatchAssertNoKey($exception);
    }
});

it('stops at max_pages', function (): void {
    config(['hadith.title_match.max_pages' => 1]);
    hadithMatchReload();
    Http::fake(['hadithapi.com/api/hadiths*' => Http::response(['hadiths' => ['data' => [], 'last_page' => 5]])]);

    expect(fn () => hadithMatchClient()->hadithRefs('sahih-bukhari'))
        ->toThrow(HadithApiComShapeException::class, 'Too many pages for [hadiths].');
});

it('refuses a book slug that is not configured and sends no request', function (): void {
    Http::fake();

    expect(fn () => hadithMatchClient()->chapters('not-a-book'))->toThrow(HadithApiComException::class);

    Http::assertNothingSent();
});

it('retries on 503, then fails with the status', function (): void {
    Http::fake(['hadithapi.com/api/*' => Http::response('', 503)]);

    try {
        hadithMatchClient()->chapters('sahih-bukhari');
        $this->fail('expected a request error');
    } catch (HadithApiComRequestException $exception) {
        expect($exception->status)->toBe(503)
            ->and($exception->getMessage())->toBe('The title source answered HTTP 503 for [chapters].');
    }

    Http::assertSentCount(5);
});

it('retries on a connection error, then fails without the URL', function (): void {
    Http::fake(function (): void {
        throw new ConnectionException('cURL error 28: https://hadithapi.com/api/hadiths?apiKey='.HADITH_MATCH_KEY);
    });

    try {
        hadithMatchClient()->hadithRefs('sahih-bukhari');
        $this->fail('expected a request error');
    } catch (HadithApiComRequestException $exception) {
        expect($exception->getMessage())->toBe('The title source could not be reached for [hadiths].');
        hadithMatchAssertNoKey($exception);
    }
});

it('never lets the key reach an exception message, a previous exception or a log', function (): void {
    $log = storage_path('framework/testing/hadith-match-'.bin2hex(random_bytes(4)).'.log');
    config(['logging.default' => 'single', 'logging.channels.single.path' => $log]);

    $cases = [
        'connection' => fn () => Http::fake(function (): void {
            throw new ConnectionException('cURL error 28: https://hadithapi.com/api/chapters?apiKey='.HADITH_MATCH_KEY);
        }),
        'server error with the key in the body' => fn () => Http::fake(['hadithapi.com/api/*' => Http::response('body '.HADITH_MATCH_KEY, 500)]),
        'forbidden' => fn () => Http::fake(['hadithapi.com/api/*' => Http::response('denied '.HADITH_MATCH_KEY, 403)]),
        'bad shape' => fn () => Http::fake(['hadithapi.com/api/*' => Http::response(['key' => HADITH_MATCH_KEY])]),
    ];

    foreach ($cases as $label => $fake) {
        $fake();

        try {
            hadithMatchClient()->chapters('sahih-bukhari');
            $this->fail('expected an error for '.$label);
        } catch (HadithApiComException $exception) {
            hadithMatchAssertNoKey($exception);
        }
    }

    expect(! File::exists($log) || ! str_contains(File::get($log), HADITH_MATCH_KEY))->toBeTrue();

    File::delete($log);
});

it('redacts the key, its urlencoded form and its rawurlencoded form', function (): void {
    config(['hadith.api_key' => 'FIXTURE KEY+1']);
    hadithMatchReload();

    $text = 'a FIXTURE KEY+1 b FIXTURE+KEY%2B1 c FIXTURE%20KEY%2B1';

    expect(hadithMatchClient()->redact($text))->toBe('a [redacted] b [redacted] c [redacted]');
});

it('refuses to build its config in production even with a key, before any request', function (): void {
    app()['env'] = 'production';
    hadithMatchReload();
    Http::fake();

    expect(fn () => HadithApiComConfig::fromConfig())->toThrow(HadithApiComConfigException::class, 'disabled in production');

    Http::assertNothingSent();
});

it('refuses to build its config without a key, and names HADITH_API_KEY only', function (): void {
    config(['hadith.api_key' => null]);
    hadithMatchReload();

    try {
        HadithApiComConfig::fromConfig();
        $this->fail('expected a config error');
    } catch (HadithApiComConfigException $exception) {
        expect($exception->getMessage())->toBe('HADITH_API_KEY is not set. Put it in your local apps/api/.env (dev-only).');
    }
});

/**
 * A client whose pauses are recorded, not slept. Each pause is appended to $sleeps in milliseconds.
 *
 * @param  list<int>  $sleeps
 */
function hadithMatchClientWithSleeps(array &$sleeps): HadithApiComClient
{
    return new HadithApiComClient(app(HadithApiComConfig::class), function (int $milliseconds) use (&$sleeps): void {
        $sleeps[] = $milliseconds;
    });
}

it('waits Retry-After seconds on a 429, then succeeds', function (): void {
    Http::fake(['hadithapi.com/api/*' => Http::sequence()
        ->push('', 429, ['Retry-After' => '7'])
        ->push(['chapters' => []]),
    ]);

    $sleeps = [];
    $chapters = hadithMatchClientWithSleeps($sleeps)->chapters('sahih-bukhari');

    expect($chapters)->toBe([])
        ->and($sleeps)->toBe([7000]);
    Http::assertSentCount(2);
});

it('caps a Retry-After above max_retry_after_seconds', function (): void {
    Http::fake(['hadithapi.com/api/*' => Http::sequence()
        ->push('', 429, ['Retry-After' => '999999'])
        ->push(['chapters' => []]),
    ]);

    $sleeps = [];
    hadithMatchClientWithSleeps($sleeps)->chapters('sahih-bukhari');

    expect($sleeps)->toBe([120000]);
});

it('reads a Retry-After HTTP date as the seconds until that date', function (): void {
    CarbonImmutable::setTestNow('2026-11-07 10:00:00');
    Http::fake(['hadithapi.com/api/*' => Http::sequence()
        ->push('', 429, ['Retry-After' => 'Sat, 07 Nov 2026 10:00:30 GMT'])
        ->push(['chapters' => []]),
    ]);

    $sleeps = [];
    hadithMatchClientWithSleeps($sleeps)->chapters('sahih-bukhari');

    expect($sleeps)->toBe([30000]);
});

it('uses the exponential backoff on a 429 without Retry-After, for at most tries attempts', function (): void {
    config([
        'hadith.title_match.retry_delay_ms' => 1000,
        'hadith.title_match.request_gap_ms' => 0,
        'hadith.title_match.tries' => 5,
    ]);
    hadithMatchReload();
    Http::fake(['hadithapi.com/api/*' => Http::response('', 429)]);

    $sleeps = [];

    expect(function () use (&$sleeps): void {
        hadithMatchClientWithSleeps($sleeps)->chapters('sahih-bukhari');
    })
        ->toThrow(HadithApiComRequestException::class, 'The title source answered HTTP 429 for [chapters].');

    expect($sleeps)->toBe([1000, 2000, 4000, 8000]);
    Http::assertSentCount(5);
});

it('spaces two consecutive requests by request_gap_ms', function (): void {
    config(['hadith.title_match.request_gap_ms' => 2500]);
    hadithMatchReload();
    Http::fake([
        'hadithapi.com/api/sahih-bukhari/chapters*' => Http::response(['chapters' => []]),
        'hadithapi.com/api/hadiths*' => Http::response(['hadiths' => ['data' => [], 'last_page' => 1]]),
    ]);

    $sleeps = [];
    $client = hadithMatchClientWithSleeps($sleeps);
    $client->chapters('sahih-bukhari');
    $client->hadithRefs('sahih-bukhari');

    expect($sleeps)->toBe([2500]);
    Http::assertSentCount(2);
});

it('never lets the key reach the message after five failed 429s', function (): void {
    Http::fake(['hadithapi.com/api/*' => Http::response('denied '.HADITH_MATCH_KEY, 429, ['Retry-After' => '1'])]);

    $sleeps = [];

    try {
        hadithMatchClientWithSleeps($sleeps)->chapters('sahih-bukhari');
        $this->fail('expected a request error');
    } catch (HadithApiComRequestException $exception) {
        expect($exception->status)->toBe(429)
            ->and($exception->getMessage())->toBe('The title source answered HTTP 429 for [chapters].');
        hadithMatchAssertNoKey($exception);
    }

    Http::assertSentCount(5);
});

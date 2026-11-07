<?php

declare(strict_types=1);

use App\Integrations\HadithApiCom\HadithApiComClient;
use App\Integrations\HadithApiCom\HadithApiComConfig;
use App\Integrations\HadithApiCom\HadithApiComRecord;
use App\Integrations\HadithApiCom\HadithApiComRequestException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/*
| recordsForNumber (ADR 0076 §8.6, step 6b.6). Placeholder text only; hadithapi.com is always faked, the key is a placeholder.
*/

const RECORDS_KEY = 'FIXTURE-KEY-RECORDS';

beforeEach(function (): void {
    Http::preventStrayRequests();
    config(['hadith.api_key' => RECORDS_KEY, 'hadith.title_match.request_gap_ms' => 0]);
});

function recordsClient(?Closure $sleep = null): HadithApiComClient
{
    return new HadithApiComClient(HadithApiComConfig::fromConfig(), $sleep ?? static function (int $milliseconds): void {});
}

it('reads only id, hadithNumber and hadithArabic of a record', function (): void {
    Http::fake(['*/hadiths*' => Http::response(['hadiths' => ['data' => [[
        'id' => 'FIXTURE-1',
        'hadithNumber' => '1',
        'hadithArabic' => 'FIXTURE نص',
        'hadithEnglish' => 'FIXTURE english',
        'chapterId' => 9,
        'bookSlug' => 'FIXTURE',
    ]]]])]);

    $records = recordsClient()->recordsForNumber('sahih-bukhari', 1);

    expect($records)->toHaveCount(1)
        ->and($records[0])->toBeInstanceOf(HadithApiComRecord::class)
        ->and(get_object_vars($records[0]))->toHaveCount(3)
        ->and($records[0]->id)->toBe('FIXTURE-1')
        ->and($records[0]->numbers)->toBe(['1'])
        ->and($records[0]->textAr)->toBe('FIXTURE نص');
});

it('keeps only records that list the number', function (): void {
    Http::fake(['*/hadiths*' => Http::response(['hadiths' => ['data' => [
        ['id' => 'FIXTURE-A', 'hadithNumber' => '4', 'hadithArabic' => 'FIXTURE a'],
        ['id' => 'FIXTURE-B', 'hadithNumber' => '2, 3', 'hadithArabic' => 'FIXTURE b'],
    ]]])]);

    $records = recordsClient()->recordsForNumber('sahih-bukhari', 3);

    expect($records)->toHaveCount(1)
        ->and($records[0]->id)->toBe('FIXTURE-B')
        ->and($records[0]->numbers)->toBe(['2', '3']);
});

it('returns an empty list on 404', function (): void {
    Http::fake(['*/hadiths*' => Http::response([], 404)]);

    expect(recordsClient()->recordsForNumber('sahih-bukhari', 3))->toBe([]);
});

it('never puts the key in an exception message', function (): void {
    Http::fake(['*/hadiths*' => Http::response([], 403)]);

    try {
        recordsClient()->recordsForNumber('sahih-bukhari', 3);
        $this->fail('The refusal was not raised.');
    } catch (HadithApiComRequestException $exception) {
        expect($exception->getMessage())->not->toContain(RECORDS_KEY)
            ->and($exception->status)->toBe(403);
    }
});

it('waits the configured gap between requests', function (): void {
    config(['hadith.title_match.request_gap_ms' => 1500]);
    Http::fake(['*/hadiths*' => Http::response(['hadiths' => ['data' => []]])]);
    $slept = [];
    $client = recordsClient(function (int $milliseconds) use (&$slept): void {
        $slept[] = $milliseconds;
    });

    $client->recordsForNumber('sahih-bukhari', 1);
    $client->recordsForNumber('sahih-bukhari', 2);

    expect($slept)->toBe([1500]);
});

it('sends the number and the book, never the key in a log-shaped value', function (): void {
    Http::fake(['*/hadiths*' => Http::response(['hadiths' => ['data' => []]])]);

    recordsClient()->recordsForNumber('sahih-bukhari', 7);

    Http::assertSent(fn (Request $request): bool => str_contains($request->url(), 'hadithNumber=7') && str_contains($request->url(), 'book=sahih-bukhari'));
});

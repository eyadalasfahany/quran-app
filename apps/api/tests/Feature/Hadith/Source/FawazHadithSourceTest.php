<?php

declare(strict_types=1);

use App\Domains\Hadith\Exceptions\HadithPinException;
use App\Domains\Hadith\Exceptions\HadithSourceFormatException;
use App\Domains\Hadith\Sources\FawazHadithSource;
use App\Domains\Hadith\Sources\SnapshotStore;
use App\Integrations\HadithApiFawaz\HadithApiFawazNotFoundException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

require_once __DIR__.'/../Support/HadithFixtureFiles.php';
require_once __DIR__.'/../Support/HadithSourceContract.php';

beforeEach(function (): void {
    Http::preventStrayRequests();
    hadithUseTempCache();
    $files = hadithFixtureFiles();
    hadithPinFixtures($files);
    hadithFakeCdn($files);
});

afterEach(function (): void {
    File::deleteDirectory((string) config('content_sources.cache_root'));
});

/**
 * @return list<string> The request paths made so far, without the commit prefix.
 */
function fawazRequestedPaths(): array
{
    $paths = [];

    foreach (Http::recorded() as [$request]) {
        $paths[] = Str::after($request->url(), '@'.hadithCommit().'/');
    }

    return $paths;
}

hadithSourceContract(fn () => app(FawazHadithSource::class));

it('passes the shared source contract', function (): void {
    expect(app(FawazHadithSource::class)->code())->toBe('fawazahmed0');
});

it('maps the three renamed slugs to fawazahmed0 edition names', function (): void {
    $source = app(FawazHadithSource::class);

    expect($source->sourceSlug('nawawi40'))->toBe('nawawi')
        ->and($source->sourceSlug('qudsi40'))->toBe('qudsi')
        ->and($source->sourceSlug('shahwaliullah40'))->toBe('dehlawi')
        ->and($source->sourceSlug('bukhari'))->toBe('bukhari')
        ->and($source->collection('nawawi40')->editionName)->toBe('ara-nawawi');

    expect(fawazRequestedPaths())->toContain('editions/ara-nawawi.json');
});

it('requests only ara editions and never ara-{c}1 or English', function (): void {
    $source = app(FawazHadithSource::class);

    foreach (config('hadith.collections') as $slug) {
        $source->collection($slug);
    }

    $paths = fawazRequestedPaths();

    expect($paths)->not->toBeEmpty();

    foreach ($paths as $path) {
        expect($path === 'editions.json' || $path === 'info.json' || str_starts_with($path, 'editions/ara-'))->toBeTrue();
        expect(str_ends_with($path, '1.json'))->toBeFalse();
        expect(str_contains($path, 'eng-'))->toBeFalse();
    }
});

it('returns the text byte for byte, including U+200F', function (): void {
    $expected = "نص تجريبي ١ —\u{200F} ليس حديثًا";
    $hadiths = app(FawazHadithSource::class)->collection('bukhari')->hadiths;

    expect($hadiths[1]->text)->toBe($expected)
        ->and(strlen((string) $hadiths[1]->text))->toBe(strlen($expected));
});

it('keeps a decimal hadith number as text', function (): void {
    $hadiths = app(FawazHadithSource::class)->collection('bukhari')->hadiths;

    expect($hadiths[1]->number)->toBe('2787.2');
});

it('keeps a hadith with no text and does not decide to skip it', function (): void {
    $collection = app(FawazHadithSource::class)->collection('bukhari');

    expect($collection->hadiths[2]->number)->toBe('3')
        ->and($collection->hadiths[2]->text)->toBe('')
        ->and($collection->hadiths)->toHaveCount(3);
});

it('keeps grades as received and a hadith without grades has an empty list', function (): void {
    $hadiths = app(FawazHadithSource::class)->collection('bukhari')->hadiths;

    expect($hadiths[0]->grades)->toHaveCount(1)
        ->and($hadiths[0]->grades[0]->gradedBy)->toBe('FIXTURE grader')
        ->and($hadiths[0]->grades[0]->grade)->toBe('FIXTURE grade')
        ->and($hadiths[1]->grades)->toBe([]);
});

it('reads section names and ranges and maps an empty name to null', function (): void {
    $sections = app(FawazHadithSource::class)->collection('bukhari')->sections;

    expect($sections[0]->key)->toBe('0')
        ->and($sections[0]->titleEn)->toBeNull()
        ->and($sections[1]->titleEn)->toBe('FIXTURE section 1')
        ->and($sections[1]->firstHadithNumber)->toBe('1')
        ->and($sections[1]->lastHadithNumber)->toBe('2');
});

it('refuses a downloaded file whose hash differs from the pin and writes nothing', function (): void {
    $files = hadithFixtureFiles();
    hadithFakeCdn(array_merge($files, ['editions/ara-bukhari.json' => 'FIXTURE different bytes']));

    expect(fn () => app(FawazHadithSource::class)->collection('bukhari'))
        ->toThrow(HadithPinException::class);

    expect(app(SnapshotStore::class)->has('editions/ara-bukhari.json'))->toBeFalse();
});

it('serves a verified cached file without a second request', function (): void {
    $source = app(FawazHadithSource::class);

    $source->collection('bukhari');
    $source->collection('bukhari');

    $requests = array_filter(fawazRequestedPaths(), fn (string $path): bool => $path === 'editions/ara-bukhari.json');

    expect($requests)->toHaveCount(1);
});

it('deletes a corrupted cached file and downloads it again', function (): void {
    $files = hadithFixtureFiles();
    $store = app(SnapshotStore::class);
    $store->write('editions/ara-bukhari.json', 'FIXTURE junk');

    app(FawazHadithSource::class)->collection('bukhari');

    expect(File::get($store->path('editions/ara-bukhari.json')))->toBe($files['editions/ara-bukhari.json']);
});

it('fails with a format error when a collection is missing its sections or hadith list', function (): void {
    $files = hadithFixtureFiles();

    $noSections = hadithEditFixture($files, 'editions/ara-bukhari.json', function (array $data): array {
        unset($data['metadata']['sections']);

        return $data;
    });
    hadithPinFixtures($noSections);
    hadithFakeCdn($noSections);

    expect(fn () => app(FawazHadithSource::class)->collection('bukhari'))
        ->toThrow(HadithSourceFormatException::class);

    $noHadiths = hadithEditFixture($files, 'editions/ara-muslim.json', function (array $data): array {
        unset($data['hadiths']);

        return $data;
    });
    hadithPinFixtures($noHadiths);
    hadithFakeCdn($noHadiths);

    expect(fn () => app(FawazHadithSource::class)->collection('muslim'))
        ->toThrow(HadithSourceFormatException::class);
});

it('fails when a hadith number would lose a trailing zero', function (): void {
    $files = hadithFixtureFiles();
    $changed = $files;
    $changed['editions/ara-bukhari.json'] = str_replace('"hadithnumber":3,', '"hadithnumber":1.10,', $files['editions/ara-bukhari.json']);
    hadithPinFixtures($changed);
    hadithFakeCdn($changed);

    expect(fn () => app(FawazHadithSource::class)->collection('bukhari'))
        ->toThrow(HadithSourceFormatException::class, 'lose a trailing zero');
});

it('fails when editions.json lacks the edition list for a collection', function (): void {
    $files = hadithFixtureFiles();
    $changed = hadithEditFixture($files, 'editions.json', function (array $data): array {
        unset($data['bukhari']['collection']);

        return $data;
    });
    hadithPinFixtures($changed);
    hadithFakeCdn($changed);

    expect(fn () => app(FawazHadithSource::class)->editionNames())
        ->toThrow(HadithSourceFormatException::class, 'no edition list for [bukhari]');
});

it('rejects an unknown slug without touching a file', function (): void {
    expect(fn () => app(FawazHadithSource::class)->collection('FIXTURE slug'))
        ->toThrow(InvalidArgumentException::class);

    Http::assertNothingSent();
});

it('reports a 404 on one collection with its path', function (): void {
    $files = hadithFixtureFiles();
    unset($files['editions/ara-malik.json']);
    hadithFakeCdn($files);

    expect(fn () => app(FawazHadithSource::class)->collection('malik'))
        ->toThrow(HadithApiFawazNotFoundException::class, 'editions/ara-malik.json');
});

it('exposes counts from info.json without any hadith text', function (): void {
    $info = app(FawazHadithSource::class)->info('bukhari');

    expect($info->slug)->toBe('bukhari')
        ->and($info->hadithCount)->toBe(3)
        ->and($info->sectionCount)->toBe(2)
        ->and($info->lastHadithNumber)->toBe('3');
});

<?php

declare(strict_types=1);

use App\Domains\Hadith\Sources\HadithSourceRegistry;
use App\Integrations\HadithApiFawaz\HadithApiFawazClient;
use App\Integrations\HadithApiFawaz\HadithApiFawazConfig;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/*
| Helpers for the step 5 tests. Placeholder bytes only: every text is FIXTURE or «نص تجريبي», never a hadith. Not a test
| file (its name does not end in Test.php); test files load it with require_once.
*/

function hadithCommit(): string
{
    return (string) config('hadith.commit');
}

function hadithCdnBase(): string
{
    return (string) config('hadith.cdn_base');
}

function hadithCdnUrl(string $path): string
{
    return hadithCdnBase().'@'.hadithCommit().'/'.$path;
}

/**
 * The source slug of each canonical slug, from the slug map (the three renamed collections).
 *
 * @return array<string, string> canonical => source slug
 */
function hadithFixtureSourceSlugs(): array
{
    $map = [];

    foreach ((array) config('hadith.collections') as $canonical) {
        $sourceSlug = (string) $canonical;

        foreach ((array) config('hadith.slug_map.fawazahmed0') as $source => $target) {
            if ($target === $canonical) {
                $sourceSlug = (string) $source;
            }
        }

        $map[(string) $canonical] = $sourceSlug;
    }

    return $map;
}

/**
 * The twelve pinned files as placeholder bytes, keyed by path.
 *
 * @return array<string, string>
 */
function hadithFixtureFiles(): array
{
    $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;
    $files = [];
    $editions = [];
    $info = [];
    $index = 0;

    foreach (hadithFixtureSourceSlugs() as $sourceSlug) {
        $index++;
        $name = 'FIXTURE collection '.$index;

        $editions[$sourceSlug] = [
            'name' => $name,
            'collection' => [[
                'name' => 'ara-'.$sourceSlug,
                'author' => 'FIXTURE author',
                'language' => 'Arabic',
                'direction' => 'rtl',
                'has_sections' => true,
                'link' => 'FIXTURE',
                'linkmin' => 'FIXTURE',
            ]],
        ];

        $infoHadiths = [];

        foreach ([1, 2, 3] as $number) {
            $infoHadiths[] = ['hadithnumber' => $number, 'arabicnumber' => $number, 'grades' => [], 'reference' => ['book' => 1, 'hadith' => $number]];
        }

        $info[$sourceSlug] = [
            'metadata' => [
                'name' => $name,
                'last_hadithnumber' => 3,
                'sections' => ['0' => '', '1' => 'FIXTURE section 1'],
            ],
            'hadiths' => $infoHadiths,
        ];

        $files['editions/ara-'.$sourceSlug.'.json'] = json_encode([
            'metadata' => [
                'name' => $name,
                'sections' => ['0' => '', '1' => 'FIXTURE section 1', '2' => 'FIXTURE section 2'],
                'section_details' => [
                    '0' => ['hadithnumber_first' => 1, 'hadithnumber_last' => 1, 'arabicnumber_first' => 1, 'arabicnumber_last' => 1],
                    '1' => ['hadithnumber_first' => 1, 'hadithnumber_last' => 2, 'arabicnumber_first' => 1, 'arabicnumber_last' => 2],
                    '2' => ['hadithnumber_first' => 3, 'hadithnumber_last' => 3, 'arabicnumber_first' => 3, 'arabicnumber_last' => 3],
                ],
            ],
            'hadiths' => [
                [
                    'hadithnumber' => 1,
                    'arabicnumber' => 1,
                    'text' => 'FIXTURE text 1 — not a hadith',
                    'grades' => [['name' => 'FIXTURE grader', 'grade' => 'FIXTURE grade']],
                    'reference' => ['book' => 1, 'hadith' => 1],
                ],
                [
                    'hadithnumber' => 2787.2,
                    'arabicnumber' => 2,
                    'text' => "نص تجريبي ١ —\u{200F} ليس حديثًا",
                    'grades' => [],
                    'reference' => ['book' => 1, 'hadith' => 2],
                ],
                [
                    'hadithnumber' => 3,
                    'arabicnumber' => 3,
                    'text' => '',
                    'grades' => [],
                    'reference' => ['book' => 1, 'hadith' => 3],
                ],
            ],
        ], $flags | JSON_THROW_ON_ERROR);
    }

    $files['editions.json'] = json_encode($editions, $flags | JSON_THROW_ON_ERROR);
    $files['info.json'] = json_encode($info, $flags | JSON_THROW_ON_ERROR);

    return $files;
}

/**
 * Changes one placeholder file: decodes it, applies the edit, encodes it again.
 *
 * @param  array<string, string>  $files
 * @param  callable(array<array-key, mixed>): array<array-key, mixed>  $edit
 * @return array<string, string>
 */
function hadithEditFixture(array $files, string $path, callable $edit): array
{
    $data = json_decode($files[$path], true, 512, JSON_THROW_ON_ERROR);
    $files[$path] = json_encode($edit($data), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

    return $files;
}

/**
 * Reads the pins from config and forgets the singletons, so the next resolve sees the new config.
 */
function hadithReload(): void
{
    app()->forgetInstance(HadithApiFawazConfig::class);
    app()->forgetInstance(HadithApiFawazClient::class);
    app()->forgetInstance(HadithSourceRegistry::class);
}

/**
 * Pins every file to the SHA-256 of the given bytes and makes retries and gaps instant.
 *
 * @param  array<string, string>  $files
 */
function hadithPinFixtures(array $files): void
{
    hadithSetPins(array_map(fn (string $bytes): string => hash('sha256', $bytes), $files));
}

/**
 * @param  array<string, string|null>  $pins
 */
function hadithSetPins(array $pins): void
{
    config([
        'hadith.files' => $pins,
        'hadith.download.retry_delay_ms' => 0,
        'hadith.download.gap_ms' => 0,
    ]);

    hadithReload();
}

/**
 * Serves the given files at the pinned commit; any other path answers 404.
 *
 * @param  array<string, string>  $files
 */
function hadithFakeCdn(array $files): void
{
    $commit = hadithCommit();

    // An earlier Http::fake() wins over a later one, so a test that serves other bytes starts from a fresh factory.
    Http::swap(new Factory);
    Http::preventStrayRequests();

    Http::fake([
        'cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@'.$commit.'/*' => function (Request $request) use ($files, $commit) {
            $path = Str::after($request->url(), '@'.$commit.'/');

            return array_key_exists($path, $files)
                ? Http::response($files[$path])
                : Http::response('', 404);
        },
    ]);
}

/**
 * A fresh cache root for this test. A real cache is never touched.
 */
function hadithUseTempCache(): string
{
    $root = storage_path('framework/testing/hadith-'.bin2hex(random_bytes(4)));
    config(['content_sources.cache_root' => $root]);

    return $root;
}

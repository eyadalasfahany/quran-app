<?php

declare(strict_types=1);

use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/*
| Helpers for the step 6 title-matcher tests. Placeholder titles only («FIXTURE chapter title»), never a real title. Not a test
| file; test files load it with require_once.
*/

/**
 * Serves hadithapi.com from fixtures. Books in $failingBooks answer HTTP 500 on every request.
 *
 * @param  array<string, list<array<string, mixed>>>  $chaptersByBook  hadithapi.com book slug => chapters
 * @param  array<string, list<array<string, mixed>>>  $hadithsByBook  hadithapi.com book slug => hadith references
 * @param  list<string>  $failingBooks
 */
function hadithMatchFake(array $chaptersByBook, array $hadithsByBook, array $failingBooks = []): void
{
    Http::swap(new Factory);
    Http::preventStrayRequests();

    Http::fake([
        'hadithapi.com/api/*' => function (Request $request) use ($chaptersByBook, $hadithsByBook, $failingBooks) {
            $path = (string) parse_url($request->url(), PHP_URL_PATH);
            $query = [];
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

            if (str_ends_with($path, '/chapters')) {
                $book = basename(dirname($path));

                return in_array($book, $failingBooks, true)
                    ? Http::response('', 500)
                    : Http::response(['chapters' => $chaptersByBook[$book] ?? []]);
            }

            if (str_ends_with($path, '/hadiths')) {
                $book = (string) ($query['book'] ?? '');

                return in_array($book, $failingBooks, true)
                    ? Http::response('', 500)
                    : Http::response(['hadiths' => ['data' => $hadithsByBook[$book] ?? [], 'last_page' => 1]]);
            }

            return Http::response('', 404);
        },
    ]);
}

/**
 * The default fixture for sahih-bukhari: book 1 accepted (its title carries U+200F and a trailing space), book 2 rejected
 * (no reference maps it, so no chapter), book 3 accepted with a title.
 *
 * @return array{0: array<string, list<array<string, mixed>>>, 1: array<string, list<array<string, mixed>>>}
 */
function hadithMatchDefault(): array
{
    $chapters = [
        'sahih-bukhari' => [
            ['id' => 1, 'chapterArabic' => "FIXTURE chapter title 1\u{200F} "],
            ['id' => 2, 'chapterArabic' => 'FIXTURE chapter title 2'],
            ['id' => 3, 'chapterArabic' => 'FIXTURE chapter title 3'],
        ],
    ];

    $hadiths = [
        'sahih-bukhari' => [
            ['hadithNumber' => 1, 'chapterId' => 1, 'text' => 'FIXTURE text 1'],
            ['hadithNumber' => 2, 'chapterId' => 1],
            ['hadithNumber' => '2787.2', 'chapterId' => 3],
        ],
    ];

    return [$chapters, $hadiths];
}

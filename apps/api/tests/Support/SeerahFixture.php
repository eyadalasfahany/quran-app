<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Domains\Seerah\Canonical\CanonicalBuild;
use App\Domains\Seerah\Canonical\StructureFileWriter;
use App\Domains\Seerah\Format\SeerahJson;
use App\Domains\Seerah\Services\CanonicalBookBuilder;
use App\Domains\Seerah\Validation\SeerahValidator;
use App\Domains\Seerah\Validation\ValidationRun;
use Illuminate\Support\Facades\File;

/**
 * A placeholder Seerah book and a passing data set for it (ADR 0089). Every text is a marked placeholder («نص تجريبي»,
 * «مدينة تجريبية»), never book text. Tests break one thing at a time in the arrays returned by files().
 */
final class SeerahFixture
{
    /** The five paragraphs of the fixture book, by id (placeholder text). */
    public const array PARAGRAPHS = [
        'p00001' => 'نص تجريبي أول في مدينة تجريبية للاختبار',
        'p00002' => 'نص تجريبي ثان في سن تجريبية مع مدينة تجريبية ومنطقة تجريبية',
        'p00003' => 'نص تجريبي ثالث في مدينة تجريبية عام للاختبار',
        'p00004' => 'نص تجريبي رابع بلغ فيه سنا تجريبيا للاختبار',
        'p00005' => 'نص تجريبي خامس عن موضع تجريبي للاختبار',
    ];

    public static function directory(): string
    {
        $directory = storage_path('framework/testing/seerah-fixture-'.bin2hex(random_bytes(6)));
        File::ensureDirectoryExists($directory);

        return $directory;
    }

    /**
     * The source text of the fixture book (OpenITI-style lines). Pure: it touches no file and no app.
     */
    public static function source(bool $braces = false): string
    {
        $lines = [
            '######OpenITI#',
            '',
            '#META# 020.BookTITLE :: FIXTURE title, not the book',
            '#META#Header#End#',
            '### | عنوان تجريبي ١',
            '# '.self::PARAGRAPHS['p00001'],
            '# '.self::PARAGRAPHS['p00002'],
            '### | السنة الأولى',
            '# '.self::PARAGRAPHS['p00003'],
            '### | عنوان تجريبي ٣',
            '# '.self::PARAGRAPHS['p00004'],
            '# '.self::PARAGRAPHS['p00005'],
            '### | عنوان تجريبي ٤',
            ...($braces ? ['# {نص تجريبي بين أقواس}'] : []),
        ];

        return implode("\n", $lines)."\n";
    }

    /**
     * The fixture book: s001 (two paragraphs), s002 (the year heading «السنة الأولى», one paragraph), s003 (two paragraphs),
     * s004 (a heading with no paragraph).
     */
    public static function build(bool $braces = false): CanonicalBuild
    {
        $path = self::directory().'/source.mARkdown';
        file_put_contents($path, self::source($braces));

        return app(CanonicalBookBuilder::class)->build($path);
    }

    /**
     * The configuration the fixture needs: two batches, one year heading, one milestone key. Apply it before validating.
     */
    public static function applyConfig(): void
    {
        config([
            'seerah.batches' => [
                'E1' => ['from' => 's001', 'to' => 's002', 'start_title' => 'عنوان تجريبي ١', 'period' => 'FIXTURE period 1'],
                'E2' => ['from' => 's003', 'to' => 's004', 'start_title' => 'عنوان تجريبي ٣', 'period' => 'FIXTURE period 2'],
            ],
            'seerah.year_headings' => ['السنة الأولى' => 1],
            'seerah.milestones' => ['birth'],
            'seerah.counts' => null,
        ]);
    }

    /**
     * The passing data set, keyed by relative path (book/structure.json is written from the build, not listed here).
     *
     * @return array<string, array<string, mixed>>
     */
    public static function files(CanonicalBuild $build): array
    {
        $canonical = $build->canonicalSha256;
        $fixtureQuote = static fn (string $para, string $quote): array => ['para' => $para, 'quote' => $quote];

        return [
            'gazetteer.json' => [
                'format' => 1,
                'source_sha256' => $canonical,
                'places' => [
                    self::place('other', null, 'region', 'أخرى', [], null, [], [self::flag('not_in_book_directly', 'FIXTURE bucket')]),
                    self::place('fx-region', null, 'region', 'منطقة تجريبية', [], self::geo(25.0, 45.0, 'area', [10.0, 30.0, 38.0, 60.0]), [$fixtureQuote('p00002', 'منطقة تجريبية')]),
                    self::place('fx-city', 'fx-region', 'city', 'مدينة تجريبية', [], self::geo(21.4, 39.8, 'city'), [$fixtureQuote('p00001', 'مدينة تجريبية')]),
                    self::place('fx-landmark', 'fx-city', 'landmark', 'موضع تجريبي', [], self::geo(21.42, 39.82, 'site'), [$fixtureQuote('p00005', 'موضع تجريبي')]),
                ],
            ],
            'events/E1.json' => [
                'format' => 1,
                'batch' => 'E1',
                'period' => 'FIXTURE period 1',
                'events' => [
                    self::event('e001', 's001', 'عنوان تجريبي ١', null, [
                        'id' => 'fx-city', 'basis' => 'stated', 'evidence' => [$fixtureQuote('p00001', 'مدينة تجريبية')], 'also' => [],
                    ], self::year('stated_age', 53, 53, 'ah', 1, 1, 'stated', [$fixtureQuote('p00002', 'في سن تجريبية')])),
                    self::event('e002', 's002', 'السنة الأولى', null, [
                        'id' => 'fx-city', 'basis' => 'stated', 'evidence' => [$fixtureQuote('p00003', 'مدينة تجريبية')], 'also' => [],
                    ], self::year('section_year', 53, 53, 'ah', 1, 1, 'stated', [])),
                ],
            ],
            'events/E2.json' => [
                'format' => 1,
                'batch' => 'E2',
                'period' => 'FIXTURE period 2',
                'events' => [
                    self::event('e003', 's003', 'عنوان تجريبي ٣', null, [
                        'id' => 'fx-landmark', 'basis' => 'stated', 'evidence' => [$fixtureQuote('p00005', 'موضع تجريبي')], 'also' => [],
                    ], self::year('stated_age', 53, 53, 'ah', 1, 1, 'stated', [$fixtureQuote('p00004', 'بلغ فيه سنا تجريبيا')])),
                ],
            ],
            'routes.json' => ['format' => 1, 'routes' => []],
            'milestones.json' => ['format' => 1, 'milestones' => [
                ['id' => 'birth', 'label_ar' => 'علامة تجريبية', 'event' => 'e001'],
            ]],
            'exclusions.json' => ['format' => 1, 'excluded' => [
                ['section' => 's004', 'reason' => 'no_chronology', 'note' => null],
            ]],
            'map/layout.region.json' => [
                'format' => 1,
                'level' => 'region',
                'parent_place' => 'fx-region',
                'viewbox' => [0, 0, 1000, 1000],
                'art' => 'design-assets/seerah/FIXTURE.svg',
                'positions' => [
                    ['place' => 'fx-region', 'x' => 700, 'y' => 200, 'label_priority' => 90, 'label_side' => 'end'],
                    ['place' => 'fx-city', 'x' => 400, 'y' => 500, 'label_priority' => 80, 'label_side' => 'end'],
                ],
                'route_paths' => [],
            ],
            'map/layout.fx-city.json' => [
                'format' => 1,
                'level' => 'fx-city',
                'parent_place' => 'fx-city',
                'viewbox' => [0, 0, 1000, 1000],
                'art' => 'design-assets/seerah/FIXTURE.svg',
                'positions' => [
                    ['place' => 'fx-landmark', 'x' => 500, 'y' => 500, 'label_priority' => 70, 'label_side' => 'end'],
                ],
                'route_paths' => [],
            ],
        ];
    }

    /**
     * Writes the structure (from the build) and every file of the data set into the folder.
     *
     * @param  array<string, array<string, mixed>>  $files
     */
    public static function write(string $directory, CanonicalBuild $build, array $files): void
    {
        File::ensureDirectoryExists($directory.'/book');
        File::put($directory.'/book/structure.json', (new StructureFileWriter)->render($build));

        foreach ($files as $relative => $data) {
            File::ensureDirectoryExists(dirname($directory.'/'.$relative));
            File::put($directory.'/'.$relative, SeerahJson::render($data));
        }
    }

    public static function validate(string $directory, CanonicalBuild $build, bool $release = false, bool $complete = false): ValidationRun
    {
        return app(SeerahValidator::class)->validate($directory, $build, $release, $complete);
    }

    /**
     * @return array<string, mixed>
     */
    public static function place(string $id, ?string $parent, string $kind, string $name, array $namesInBook, ?array $geo, array $evidence, array $flags = []): array
    {
        return [
            'id' => $id,
            'parent' => $parent,
            'kind' => $kind,
            'name_ar' => $name,
            'names_in_book' => $namesInBook,
            'name_en' => null,
            'geo' => $geo,
            'evidence' => $evidence,
            'origin' => 'drafted_by_agent',
            'flags' => $flags,
            'note' => null,
        ];
    }

    /**
     * @param  list<float>|null  $box
     * @return array<string, mixed>
     */
    public static function geo(float $lat, float $lng, string $precision, ?array $box = null): array
    {
        return ['lat' => $lat, 'lng' => $lng, 'precision' => $precision, 'source' => 'manual', 'box' => $box, 'note' => null];
    }

    /**
     * @return array<string, string|null>
     */
    public static function flag(string $code, ?string $note): array
    {
        return ['code' => $code, 'note' => $note];
    }

    /**
     * @param  array<string, mixed>  $place
     * @param  array<string, mixed>|null  $year
     * @return array<string, mixed>
     */
    public static function event(string $id, string $section, string $title, ?array $span, array $place, ?array $year): array
    {
        return [
            'id' => $id,
            'section' => $section,
            'title_ar' => $title,
            'span' => $span,
            'kind' => 'event',
            'place' => $place + ['basis' => 'stated'],
            'year' => $year,
            'route' => null,
            'order_exception' => null,
            'origin' => 'drafted_by_agent',
            'flags' => [],
            'note' => null,
        ];
    }

    /**
     * @param  list<array{para: string, quote: string}>  $evidence
     * @return array<string, mixed>
     */
    public static function year(string $basis, ?int $ageFrom, ?int $ageTo, ?string $era, ?int $hijriFrom, ?int $hijriTo, string $certainty, array $evidence): array
    {
        return [
            'basis' => $basis,
            'age_from' => $ageFrom,
            'age_to' => $ageTo,
            'era' => $era,
            'hijri_from' => $hijriFrom,
            'hijri_to' => $hijriTo,
            'certainty' => $certainty,
            'evidence' => $evidence,
        ];
    }
}

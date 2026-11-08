<?php

declare(strict_types=1);

use App\Domains\Hadith\Repositories\Contracts\HadithExplanationRepository;
use App\Domains\Hadith\Services\HadithExplanationMapper;

/**
 * Placeholder Arabic words only (the word set keeps Arabic letters): every fixture is «نص تجريبي», not a hadith.
 */
const HADITH_EXPL_WORDS = ['تجريبي', 'ألف', 'باءة', 'جيمة', 'دالة', 'هاءة', 'واوة', 'زاية', 'حاءة', 'طاءة'];

/**
 * @param  array<string, list<array{number: string, text: string}>>  $collections
 */
function hadithExplRepository(array $collections): HadithExplanationRepository
{
    return new class($collections) implements HadithExplanationRepository
    {
        /**
         * @param  array<string, list<array{number: string, text: string}>>  $collections
         */
        public function __construct(private readonly array $collections) {}

        public function collectionHadith(string $collectionSlug): array
        {
            return $this->collections[$collectionSlug] ?? [];
        }

        public function replaceForResource(int $resourceId, array $explanations, array $links): void {}
    };
}

/**
 * @param  list<string>  $words
 */
function hadithExplText(array $words): string
{
    return implode(' ', $words);
}

it('classifies with exact integer thresholds', function (int $size, int $best, int $second, string $expected): void {
    expect(HadithExplanationMapper::classify($size, $best, $second, 70, 10))->toBe($expected);
})->with([
    'containment exactly at the minimum is accepted' => [10, 7, 0, 'accepted'],
    'one word under the minimum is below' => [10, 6, 0, 'below'],
    'gap exactly at the minimum is accepted' => [10, 9, 8, 'accepted'],
    'gap one word under the minimum is ambiguous' => [10, 9, 9, 'ambiguous'],
    'equal second best is ambiguous' => [10, 10, 10, 'ambiguous'],
    'an empty record is below' => [0, 0, 0, 'below'],
    'a long record needs proportionally more shared words' => [30, 21, 0, 'accepted'],
    'a long record below 70 percent is below' => [30, 20, 0, 'below'],
]);

it('links a record to the hadith it contains when the lead is clear', function (): void {
    $words = array_slice(HADITH_EXPL_WORDS, 0, 10);
    $repository = hadithExplRepository([
        'bukhari' => [
            ['number' => '1', 'text' => hadithExplText($words)],
            ['number' => '2', 'text' => hadithExplText([...array_slice($words, 0, 7), 'ثاءة', 'خاءة', 'ذالة'])],
            ['number' => '3', 'text' => hadithExplText(['رائة', 'زايية', 'سينة'])],
        ],
    ]);
    $records = [['id' => 9, 'attribution' => 'نص تجريبي — رواه البخاري', 'text' => hadithExplText($words)]];

    $measure = (new HadithExplanationMapper($repository))->measure($records, ['bukhari']);
    $links = HadithExplanationMapper::links($measure['pairs'], 70, 10);

    expect($measure['named'])->toBe(1)
        ->and($links)->toHaveCount(1)
        ->and($links[0]['collection'])->toBe('bukhari')
        ->and($links[0]['number'])->toBe('1')
        ->and($links[0]['explanation_id'])->toBe(9)
        ->and($links[0]['evidence'])->toBe('shared=10;size=10;second=7');
});

it('leaves a record unlinked when two hadith are equally close', function (): void {
    $words = array_slice(HADITH_EXPL_WORDS, 0, 10);
    $repository = hadithExplRepository([
        'muslim' => [
            ['number' => '5', 'text' => hadithExplText($words)],
            ['number' => '6', 'text' => hadithExplText($words)],
        ],
    ]);
    $records = [['id' => 3, 'attribution' => 'نص تجريبي — رواه مسلم', 'text' => hadithExplText($words)]];

    $measure = (new HadithExplanationMapper($repository))->measure($records, ['muslim']);

    expect(HadithExplanationMapper::links($measure['pairs'], 70, 10))->toBe([])
        ->and(HadithExplanationMapper::classify(10, 10, 10, 70, 10))->toBe('ambiguous');
});

it('maps an agreed attribution to both of its collections', function (): void {
    $words = array_slice(HADITH_EXPL_WORDS, 0, 10);
    $repository = hadithExplRepository([
        'bukhari' => [['number' => '1', 'text' => hadithExplText($words)]],
        'muslim' => [['number' => '4', 'text' => hadithExplText($words)]],
    ]);
    $records = [['id' => 2, 'attribution' => 'نص تجريبي — متفق عليه', 'text' => hadithExplText($words)]];

    $links = HadithExplanationMapper::links(
        (new HadithExplanationMapper($repository))->measure($records, ['bukhari', 'muslim'])['pairs'],
        70,
        10,
    );

    expect(array_map(fn (array $link): string => $link['collection'].':'.$link['number'], $links))->toBe(['bukhari:1', 'muslim:4']);
});

it('never links a control pair and reports the records no name covers', function (): void {
    $words = array_slice(HADITH_EXPL_WORDS, 0, 10);
    $repository = hadithExplRepository([
        'bukhari' => [['number' => '1', 'text' => hadithExplText($words)]],
        'malik' => [['number' => '8', 'text' => hadithExplText(['رائة', 'زايية', 'سينة'])]],
    ]);
    $records = [
        ['id' => 4, 'attribution' => 'نص تجريبي — ليس اسمًا', 'text' => hadithExplText($words)],
    ];

    $measure = (new HadithExplanationMapper($repository))->measure($records, ['bukhari', 'malik']);

    expect($measure['unnamed'])->toBe(1)
        ->and($measure['pairs'])->not->toBeEmpty()
        ->and(array_unique(array_column($measure['pairs'], 'kind')))->toBe(['control'])
        ->and(HadithExplanationMapper::links($measure['pairs'], 70, 10))->toBe([]);
});

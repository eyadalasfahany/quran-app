<?php

declare(strict_types=1);

use App\Domains\Hadith\Exceptions\HadithExplanationException;
use App\Domains\Hadith\Services\HadithExplanationLinksFile;

const HADITH_EXPL_SHA = '0000000000000000000000000000000000000000000000000000000000000001';

function hadithExplLink(string $collection, string $number, int $explanationId): array
{
    return [
        'collection' => $collection,
        'number' => $number,
        'explanation_id' => $explanationId,
        'status' => 'accepted',
        'evidence' => 'shared=10;size=10;second=7',
    ];
}

it('encodes the links deterministically in configured collection order and natural number order', function (): void {
    $file = new HadithExplanationLinksFile;
    $thresholds = ['min_containment_percent' => 70, 'min_gap_percent' => 10];
    $links = [
        hadithExplLink('muslim', '10', 3),
        hadithExplLink('bukhari', '10', 2),
        hadithExplLink('bukhari', '9', 5),
        hadithExplLink('bukhari', '9', 4),
    ];

    $first = $file->encode(HADITH_EXPL_SHA, $thresholds, $links);
    $second = $file->encode(HADITH_EXPL_SHA, $thresholds, array_reverse($links));

    expect($first)->toBe($second)
        ->and(hash('sha256', $first))->toBe(hash('sha256', $second))
        ->and(str_ends_with($first, "\n"))->toBeTrue();

    $decoded = $file->decode($first);

    expect(array_map(fn (array $link): string => $link['collection'].':'.$link['number'].':'.$link['explanation_id'], $decoded['links']))
        ->toBe(['bukhari:9:4', 'bukhari:9:5', 'bukhari:10:2', 'muslim:10:3'])
        ->and($decoded['snapshot_sha256'])->toBe(HADITH_EXPL_SHA);
});

it('writes no text key: only the closed set of link keys and the hash', function (): void {
    $bytes = (new HadithExplanationLinksFile)->encode(HADITH_EXPL_SHA, ['min_containment_percent' => 70, 'min_gap_percent' => 10], [hadithExplLink('bukhari', '1', 1)]);
    $document = json_decode($bytes, true, 512, JSON_THROW_ON_ERROR);

    expect(array_keys($document))->toBe(['schema', 'source', 'snapshot_sha256', 'thresholds', 'links'])
        ->and(array_keys($document['links'][0]))->toBe(['collection', 'number', 'explanation_id', 'status', 'evidence']);
});

it('refuses a file with a key outside the closed list', function (): void {
    $bytes = json_encode([
        'schema' => 1,
        'source' => 'hadeethenc',
        'snapshot_sha256' => HADITH_EXPL_SHA,
        'thresholds' => [],
        'links' => [hadithExplLink('bukhari', '1', 1) + ['text' => 'FIXTURE text — not a hadith']],
    ], JSON_THROW_ON_ERROR);

    expect(fn () => (new HadithExplanationLinksFile)->decode($bytes))->toThrow(HadithExplanationException::class);
});

it('refuses a repeated link, a status other than accepted, and a bad hash', function (string $case): void {
    $links = [hadithExplLink('bukhari', '1', 1)];
    $document = ['schema' => 1, 'source' => 'hadeethenc', 'snapshot_sha256' => HADITH_EXPL_SHA, 'thresholds' => [], 'links' => $links];

    match ($case) {
        'repeated' => $document['links'] = [...$links, ...$links],
        'status' => $document['links'][0]['status'] = 'ambiguous',
        'hash' => $document['snapshot_sha256'] = 'not-a-hash',
    };

    expect(fn () => (new HadithExplanationLinksFile)->decode(json_encode($document, JSON_THROW_ON_ERROR)))->toThrow(HadithExplanationException::class);
})->with(['repeated', 'status', 'hash']);

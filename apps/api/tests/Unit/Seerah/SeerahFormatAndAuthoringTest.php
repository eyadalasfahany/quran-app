<?php

declare(strict_types=1);

use App\Domains\Seerah\Authoring\PlaceCandidates;
use App\Domains\Seerah\Authoring\QuoteExtractor;
use App\Domains\Seerah\Authoring\SearchText;
use App\Domains\Seerah\Authoring\SkeletonWriter;
use App\Domains\Seerah\Canonical\BookCanonicalizer;
use App\Domains\Seerah\Dataset\BookIndex;
use App\Domains\Seerah\Exceptions\SeerahAuthoringException;
use App\Domains\Seerah\Format\SeerahJson;
use App\Support\HadithText\HadithSearchTextNormalizer;
use Tests\Support\SeerahFixture;

// Placeholder text only (ADR 0089): every paragraph here is a marked placeholder from SeerahFixture or written for this file.

it('renders canonical JSON: two-space indent, literal Arabic, no escaped slashes, one trailing newline', function (): void {
    $text = SeerahJson::render(['format' => 1, 'name' => 'نص تجريبي', 'path' => 'a/b', 'nested' => ['x' => null], 'empty' => []]);

    expect($text)->toBe("{\n  \"format\": 1,\n  \"name\": \"نص تجريبي\",\n  \"path\": \"a/b\",\n  \"nested\": {\n    \"x\": null\n  },\n  \"empty\": []\n}\n")
        ->and(SeerahJson::canonicalText($text))->toBe($text)
        ->and(SeerahJson::canonicalText('{"format":1}'))->toBe("{\n  \"format\": 1\n}\n");
});

it('keeps an empty object as an object and a float with its fraction', function (): void {
    $text = SeerahJson::render(['decisions' => new stdClass, 'lat' => 21.0]);

    expect($text)->toContain('"decisions": {}')
        ->and($text)->toContain('"lat": 21.0');
});

it('normalises search text exactly like the hadith search normaliser', function (): void {
    $normaliser = new HadithSearchTextNormalizer;
    $samples = [
        'مَكَّةُ المُكَرَّمَة',
        "  أَحْمَد\u{200B}  بن   علي\n\tوالسلام ",
        "الصلاة\u{0640}والسلام\u{064B}",
        'ى ة أ إ آ ٱ ؤ',
        '',
        '   ',
        'نص تجريبي أول في مدينة تجريبية للاختبار',
    ];

    foreach ($samples as $sample) {
        expect(SearchText::normalise($sample))->toBe($normaliser->normalize($sample));
    }
});

it('finds every occurrence of a term and maps it back to the exact bytes of the book text', function (): void {
    $text = 'نص تجريبي ثان مع مَدِينَة  تجريبية وعن مدينة تجريبية';

    $found = SearchText::occurrences($text, 'مدينة تجريبية');

    expect($found)->toHaveCount(2);

    foreach ($found as [$start, $end]) {
        expect(substr($text, $start, $end - $start))->toMatch('/^م.*ة$/u');
    }

    expect(substr($text, $found[0][0], $found[0][1] - $found[0][0]))->toBe('مَدِينَة  تجريبية')
        ->and(SearchText::occurrences($text, '   '))->toBe([])
        ->and(SearchText::occurrences($text, ''))->toBe([]);
});

it('prints the exact paragraph slice between two words, byte for byte', function (): void {
    $paragraph = SeerahFixture::PARAGRAPHS['p00002'];
    $quote = (new QuoteExtractor)->extract($paragraph, 'مدينة', 'تجريبية');

    expect($quote['text'])->toBe('مدينة تجريبية')
        ->and(substr($paragraph, $quote['start'], $quote['end'] - $quote['start']))->toBe($quote['text'])
        ->and(str_contains($paragraph, $quote['text']))->toBeTrue();

    $second = (new QuoteExtractor)->extract($paragraph, 'تجريبية', 'ومنطقة', 2);

    expect($second['text'])->toBe('تجريبية ومنطقة');
});

it('ignores punctuation when it matches words, and refuses a missing start or end word', function (): void {
    $extractor = new QuoteExtractor;

    expect($extractor->extract('نص تجريبي، ثم مدينة تجريبية.', 'تجريبي', 'مدينة')['text'])->toBe('تجريبي، ثم مدينة');

    expect(fn () => $extractor->extract(SeerahFixture::PARAGRAPHS['p00001'], 'غائب', 'تجريبية'))
        ->toThrow(SeerahAuthoringException::class)
        ->and(fn () => $extractor->extract(SeerahFixture::PARAGRAPHS['p00001'], 'مدينة', 'غائب'))
        ->toThrow(SeerahAuthoringException::class);
});

it('writes one draft event per section with the heading copied, the span from the structure, and no place or year', function (): void {
    $book = (new BookCanonicalizer)->canonicalize(SeerahFixture::source(), []);
    $index = new BookIndex($book, ['السنة الأولى' => 1]);

    $skeleton = (new SkeletonWriter)->build('E2', 'FIXTURE period 2', 2, 3, $index, $book);
    $decoded = json_decode($skeleton['json'], true, flags: JSON_THROW_ON_ERROR);

    expect($skeleton['count'])->toBe(2)
        ->and(array_column($decoded['events'], 'id'))->toBe(['e003', 'e004'])
        ->and($decoded['events'][0]['title_ar'])->toBe('عنوان تجريبي ٣')
        ->and($decoded['events'][0]['span'])->toBe(['from' => 'p00004', 'to' => 'p00005'])
        ->and($decoded['events'][0]['place'])->toBeNull()
        ->and($decoded['events'][0]['year'])->toBeNull()
        ->and($decoded['events'][1]['span'])->toBeNull()
        ->and($skeleton['json'])->toBe(SeerahJson::canonicalText($skeleton['json']));
});

it('lists place names and cue-word names with counts, in a fixed order, with the book spelling', function (): void {
    $book = (new BookCanonicalizer)->canonicalize("######OpenITI#\n\n#META#Header#End#\n### | عنوان تجريبي\n# نص تجريبي ذهب إلى مكة ثم إلى الطائف\n# نص تجريبي عن مكة والطائف\n", []);
    $candidates = new PlaceCandidates;
    $rows = $candidates->find($book);

    $seedMakkah = array_values(array_filter($rows, static fn (array $row): bool => $row['source'] === 'seed' && $row['name'] === 'مكة'));
    $cueTaif = array_values(array_filter($rows, static fn (array $row): bool => $row['source'] === 'cue' && $row['name'] === 'الطائف'));

    expect($seedMakkah)->toHaveCount(1)
        ->and($seedMakkah[0]['count'])->toBe(2)
        ->and($cueTaif)->toHaveCount(1)
        ->and($cueTaif[0]['count'])->toBe(1)
        ->and($candidates->find($book))->toBe($rows);
});

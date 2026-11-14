<?php

declare(strict_types=1);

use App\Domains\Seerah\Enums\SectionLevel;
use App\Domains\Seerah\Services\CanonicalBookBuilder;

it('pins the full 40-character GitHub ref and the SHA-256 of the committed file', function (): void {
    expect(config('seerah.source.ref'))->toMatch('~^[0-9a-f]{40}$~')
        ->and(config('seerah.source.url'))->toContain((string) config('seerah.source.ref'))
        ->and(config('seerah.source.sha256'))->toMatch('~^[0-9a-f]{64}$~')
        ->and(config('seerah.source.metadata_sha256'))->toMatch('~^[0-9a-f]{64}$~')
        ->and(config('seerah.source.version'))->toBe('Shamela0023692-ara1');
});

it('keeps the committed file byte for byte at its pin, with its metadata file next to it', function (): void {
    $file = database_path((string) config('seerah.source.file'));
    $metadata = database_path((string) config('seerah.source.metadata_file'));

    expect(is_file($file))->toBeTrue()
        ->and(filesize($file))->toBe(config('seerah.source.bytes'))
        ->and(hash_file('sha256', $file))->toBe(config('seerah.source.sha256'))
        ->and(hash_file('sha256', $metadata))->toBe(config('seerah.source.metadata_sha256'));
});

it('ships a licence notice that names the source, its ref, its licence and its changes', function (): void {
    $notice = database_path('data/seerah/source/LICENSE-NOTICE.md');

    expect(is_file($notice))->toBeTrue();

    $text = (string) file_get_contents($notice);

    expect($text)->toContain('CC BY-NC-SA 4.0')
        ->toContain('Shamela0023692-ara1')
        ->toContain((string) config('seerah.source.ref'))
        ->toContain((string) config('seerah.source.sha256'))
        ->toContain('**To the file: none.**');
});

it('canonicalizes the pinned file to the pinned canonical SHA-256 with the counts of the report', function (): void {
    $build = app(CanonicalBookBuilder::class)->build(null);
    $book = $build->book;

    expect($build->pinsChecked)->toBeTrue()
        ->and($build->canonicalPinMissing)->toBeFalse()
        ->and($build->canonicalSha256)->toBe(config('seerah.canonical_sha256'))
        ->and($book->counts->lastPage)->toBe(280)
        ->and($book->counts->footnoteBlocks)->toBe(64)
        ->and($book->counts->footnoteLines)->toBe(103)
        ->and($book->counts->bracedRuns)->toBe(0);

    $levels = [];

    foreach ($book->sections as $section) {
        $levels[$section->level->value] = ($levels[$section->level->value] ?? 0) + 1;
    }

    expect($levels)->toEqualCanonicalizing([SectionLevel::Front->value => 2, SectionLevel::Heading->value => 256])
        ->and($book->sections)->toHaveCount(258)
        ->and($book->paragraphs)->toHaveCount(1087);
});

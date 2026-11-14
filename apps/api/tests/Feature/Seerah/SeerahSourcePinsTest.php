<?php

declare(strict_types=1);

use App\Domains\Seerah\Enums\SectionLevel;
use App\Domains\Seerah\Services\CanonicalBookBuilder;

it('pins the full 40-character GitHub ref and the SHA-256 of the committed file', function (): void {
    expect(config('seerah.source.ref'))->toMatch('~^[0-9a-f]{40}$~')
        ->and(config('seerah.source.url'))->toContain((string) config('seerah.source.ref'))
        ->and(config('seerah.source.sha256'))->toMatch('~^[0-9a-f]{64}$~')
        ->and(config('seerah.source.metadata_sha256'))->toMatch('~^[0-9a-f]{64}$~');
});

it('keeps the committed file byte for byte at its pin, with its metadata file next to it', function (): void {
    $file = database_path((string) config('seerah.source.file'));
    $metadata = database_path((string) config('seerah.source.metadata_file'));

    expect(is_file($file))->toBeTrue()
        ->and(filesize($file))->toBe(config('seerah.source.bytes'))
        ->and(hash_file('sha256', $file))->toBe(config('seerah.source.sha256'))
        ->and(hash_file('sha256', $metadata))->toBe(config('seerah.source.metadata_sha256'));
});

it('ships a licence notice that names the source, its ref and its licence, and says the file is unchanged', function (): void {
    $notice = database_path('data/seerah/source/LICENSE-NOTICE.md');

    expect(is_file($notice))->toBeTrue();

    $text = (string) file_get_contents($notice);

    expect($text)->toContain('CC BY-NC-SA 4.0')
        ->toContain((string) config('seerah.source.ref'))
        ->toContain((string) config('seerah.source.sha256'))
        ->toContain('**To the file: none.**');
});

it('canonicalizes the pinned file to the pinned canonical SHA-256 with the section counts of the report', function (): void {
    $build = app(CanonicalBookBuilder::class)->build(null);

    expect($build->pinsChecked)->toBeTrue()
        ->and($build->canonicalPinMissing)->toBeFalse()
        ->and($build->canonicalSha256)->toBe(config('seerah.canonical_sha256'))
        ->and($build->book->counts->lastPage)->toBe(259)
        ->and($build->book->counts->milestoneTokens)->toBe(233);

    $levels = [];

    foreach ($build->book->sections as $section) {
        $levels[$section->level->value] = ($levels[$section->level->value] ?? 0) + 1;
    }

    expect($levels)->toEqualCanonicalizing([SectionLevel::Bab->value => 4, SectionLevel::Fasl->value => 13, SectionLevel::Heading->value => 234]);

    $numbered = array_filter($build->book->sections, static fn ($section): bool => $section->printedNumber !== null);

    expect($numbered)->toHaveCount(192)
        ->and($build->book->counts->printedLineMarkers)->toBe(1053)
        ->and($build->book->paragraphs)->toHaveCount(251);
});

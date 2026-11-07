<?php

declare(strict_types=1);

/*
| The OpenITI pins and patterns in config/hadith.php (ADR 0076 §8.2, §9.2, step 6b.6). Every SHA-256 is 64 lowercase hex.
*/

it('pins every OpenITI file with a lowercase SHA-256 and a golden unit count', function (): void {
    $files = config('hadith.openiti.files');

    expect($files)->toHaveCount(7);

    foreach ($files as $slug => $file) {
        expect($file['sha256'])->toMatch('~^[0-9a-f]{64}$~', 'sha256 of '.$slug)
            ->and($file['unit_count'])->toBeInt()
            ->and($file['unit_start'])->toBeString()
            ->and($file['unit_stop'])->toBeString();
    }
});

it('holds the four chapter markup patterns of step 6b.7', function (): void {
    $files = config('hadith.openiti.files');

    expect(array_keys(array_filter($files, static fn (array $file): bool => isset($file['markup']))))
        ->toEqualCanonicalizing(['bukhari', 'nasai', 'abudawud', 'ibnmajah']);
});

it('keeps the release and the Tirmidhi commit as pinned', function (): void {
    expect(config('hadith.openiti.release'))->toBe('2023.1.8')
        ->and(config('hadith.openiti.tirmidhi_commit'))->toBe('01a1544130e0236850ef2698923ad01575c5bd7c');
});

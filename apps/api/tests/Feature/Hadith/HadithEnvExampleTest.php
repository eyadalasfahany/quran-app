<?php

declare(strict_types=1);

it('has HADITH_API_KEY empty with the dev-only comment directly above', function (): void {
    $lines = preg_split('/\R/', (string) file_get_contents(base_path('.env.example'))) ?: [];

    $keyLines = array_keys(array_filter(
        $lines,
        fn (string $line): bool => str_starts_with($line, 'HADITH_API_KEY'),
    ));

    expect($keyLines)->toHaveCount(1);

    $index = $keyLines[0];

    expect($lines[$index])->toBe('HADITH_API_KEY=')
        ->and($lines[$index - 1] ?? null)->toBe('# dev-only, used by hadith:match-section-titles');
});

it('no longer carries the old placeholder', function (): void {
    $contents = (string) file_get_contents(base_path('.env.example'));

    expect($contents)->not->toContain('hADITH_API_KEY');
});

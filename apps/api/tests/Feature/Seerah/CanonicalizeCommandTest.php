<?php

declare(strict_types=1);

// Placeholder markup only: the texts below are marked placeholders, never book text.

/**
 * @param  list<string>  $lines
 */
function seerahCommandSource(array $lines): string
{
    $directory = storage_path('framework/testing/seerah-'.getmypid());
    File::ensureDirectoryExists($directory);
    $path = $directory.'/source-'.md5(implode("\n", $lines)).'.mARkdown';

    file_put_contents($path, implode("\n", [
        '######OpenITI#',
        '',
        '#META#Header#End#',
        ...$lines,
    ])."\n");

    return $path;
}

it('refuses a run over another file without an output, and writes nothing', function (): void {
    $source = seerahCommandSource(['### | عنوان تجريبي ١', '# نص تجريبي ١']);

    $this->artisan('seerah:canonicalize', ['--source' => $source])
        ->expectsOutputToContain('--source needs --output')
        ->assertExitCode(1);
});

it('writes the structure of a fixture file in the fixed key order with two-space indent', function (): void {
    $source = seerahCommandSource(['### | عنوان تجريبي ٢', '# PageV01P004 نص تجريبي ٣', '### | عنوان تجريبي ٤']);
    $output = storage_path('framework/testing/seerah-'.getmypid().'/structure-fixture.json');

    $this->artisan('seerah:canonicalize', ['--source' => $source, '--output' => $output])
        ->expectsOutputToContain('pins checked: no')
        ->assertExitCode(0);

    $text = (string) file_get_contents($output);
    $data = json_decode($text, true, flags: JSON_THROW_ON_ERROR);

    expect(array_keys($data))->toBe(['format', 'source_sha256', 'canonical_sha256', 'counts', 'sections'])
        ->and($data['format'])->toBe(1)
        ->and($data['sections'])->toHaveCount(2)
        ->and(array_keys($data['sections'][0]))->toBe(['id', 'level', 'title', 'page', 'paragraph_from', 'paragraph_to'])
        ->and($data['sections'][0])->toMatchArray(['id' => 's001', 'level' => 'heading', 'page' => 0, 'paragraph_from' => 'p00001', 'paragraph_to' => 'p00001'])
        ->and($data['sections'][1])->toMatchArray(['id' => 's002', 'paragraph_from' => null])
        ->and($text)->toContain("\n  \"format\": 1,\n")
        ->and(str_ends_with($text, "}\n"))->toBeTrue()
        ->and(str_contains($text, '\\u'))->toBeFalse();
});

it('fails and writes no structure when the source has an unparsed line', function (): void {
    $source = seerahCommandSource(['~~نص تجريبي ٥']);
    $output = storage_path('framework/testing/seerah-'.getmypid().'/structure-broken.json');
    @unlink($output);

    $this->artisan('seerah:canonicalize', ['--source' => $source, '--output' => $output])
        ->expectsOutputToContain('continuation_without_block')
        ->assertExitCode(1);

    expect(is_file($output))->toBeFalse();
});

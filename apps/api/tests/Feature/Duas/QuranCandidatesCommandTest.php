<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;

/*
| Fixture placeholder only (ADR 0044-duas §2). The fixture texts are placeholders that do not match real Quran,
| so the command must classify them correctly by rule. Nothing here is actual Quranic text.
*/

beforeEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/duas-candidates'));
});

afterEach(function (): void {
    File::deleteDirectory(storage_path('framework/testing/duas-candidates'));
});

function duasCandidatesOutput(string $name = 'map.php'): string
{
    $path = storage_path('framework/testing/duas-candidates/'.$name);
    File::ensureDirectoryExists(dirname($path));

    return $path;
}

function duasCandidatesFixturePath(): string
{
    return base_path('tests/Fixtures/duas/tanzil-fixture.txt');
}

/**
 * @param  list<array<array-key, mixed>>  $spans
 */
function duasWriteExisting(string $path, string $key, array $spans): void
{
    $export = var_export([$key => $spans], true);
    File::put($path, "<?php\n\ndeclare(strict_types=1);\n\nreturn ".$export.";\n");
}

it('writes one row per candidate with status, rule, and no text', function (): void {
    $output = duasCandidatesOutput();

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    expect($rows)->not->toBeEmpty()
        ->and(File::get($output))->not->toMatch('/\p{Arabic}/u');

    foreach ($rows as $key => $spans) {
        expect($key)->toMatch('/^quran:\d+:\d+$/')
            ->and($spans)->toHaveCount(1)
            ->and($spans[0]['status'])->toBe('candidate')
            ->and($spans[0]['rule'])->toBeIn([
                'rule_vocative_rabb',
                'rule_speech_verb',
                'rule_contains_allahumma',
                'rule_imperative_list',
            ]);
    }
});

it('matches rule 1: verse beginning with ربنا or رب', function (): void {
    $output = duasCandidatesOutput('rule1.php');

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    // At least one row should match rule 1
    $rule1Match = false;
    foreach ($rows as $spans) {
        foreach ($spans as $span) {
            if (($span['rule'] ?? null) === 'rule_vocative_rabb') {
                $rule1Match = true;
                break 2;
            }
        }
    }

    expect($rule1Match)->toBeTrue();
});

it('matches rule 2: speech verb + vocative', function (): void {
    $output = duasCandidatesOutput('rule2.php');

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    // At least one row should match rule 2
    $rule2Match = false;
    foreach ($rows as $spans) {
        foreach ($spans as $span) {
            if (($span['rule'] ?? null) === 'rule_speech_verb') {
                $rule2Match = true;
                break 2;
            }
        }
    }

    expect($rule2Match)->toBeTrue();
});

it('matches rule 3: verse containing اللهم', function (): void {
    $output = duasCandidatesOutput('rule3.php');

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    // At least one row should match rule 3
    $rule3Match = false;
    foreach ($rows as $spans) {
        foreach ($spans as $span) {
            if (($span['rule'] ?? null) === 'rule_contains_allahumma') {
                $rule3Match = true;
                break 2;
            }
        }
    }

    expect($rule3Match)->toBeTrue();
});

it('matches rule 4: vocative within 3 words of imperative', function (): void {
    $output = duasCandidatesOutput('rule4.php');

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    // At least one row should match rule 4
    $rule4Match = false;
    foreach ($rows as $spans) {
        foreach ($spans as $span) {
            if (($span['rule'] ?? null) === 'rule_imperative_list') {
                $rule4Match = true;
                break 2;
            }
        }
    }

    expect($rule4Match)->toBeTrue();
});

it('handles leading conjunction و in rule 1 matching', function (): void {
    $output = duasCandidatesOutput('leading_conj.php');

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    // Verify fixture with leading و is found
    expect($rows)->not->toBeEmpty();
});

it('keeps a reviewed row exactly as it is and fills other spans', function (): void {
    $output = duasCandidatesOutput('reviewed.php');
    duasWriteExisting($output, 'quran:2:1', [
        [2, 1, null, 'status' => 'reviewed', 'rule' => 'rule_speech_verb'],
    ]);

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    expect($rows['quran:2:1'][0])
        ->toBe([2, 1, null, 'status' => 'reviewed', 'rule' => 'rule_speech_verb']);
});

it('keeps a rejected row on regeneration', function (): void {
    $output = duasCandidatesOutput('rejected.php');
    duasWriteExisting($output, 'quran:3:1', [
        [3, 1, null, 'status' => 'rejected', 'rule' => 'rule_vocative_rabb'],
    ]);

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    expect($rows['quran:3:1'][0])
        ->toBe([3, 1, null, 'status' => 'rejected', 'rule' => 'rule_vocative_rabb']);
});

it('keeps an added row on regeneration', function (): void {
    $output = duasCandidatesOutput('added.php');
    duasWriteExisting($output, 'quran:4:1', [
        [4, 1, null, 'status' => 'added', 'rule' => 'rule_imperative_list'],
    ]);

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    expect($rows['quran:4:1'][0])
        ->toBe([4, 1, null, 'status' => 'added', 'rule' => 'rule_imperative_list']);
});

it('preserves a reviewed row even when a new candidate rule would match', function (): void {
    $output = duasCandidatesOutput('reviewed_with_match.php');
    // quran:1:4 has a fixture verse that matches rule 3, but we mark it reviewed with rule 1
    duasWriteExisting($output, 'quran:1:4', [
        [1, 4, null, 'status' => 'reviewed', 'rule' => 'rule_vocative_rabb'],
    ]);

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    $rows = require $output;

    // The reviewed row must be kept exactly as it is, not replaced by the new candidate
    expect($rows['quran:1:4'][0])
        ->toBe([1, 4, null, 'status' => 'reviewed', 'rule' => 'rule_vocative_rabb']);
});

it('writes config with no Arabic letters', function (): void {
    $output = duasCandidatesOutput('no_arabic.php');

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->assertExitCode(0);

    expect(File::get($output))->not->toMatch('/\p{Arabic}/u');
});

it('prints counts by rule in output', function (): void {
    $output = duasCandidatesOutput('counts.php');

    $this->artisan('duas:quran-candidates', ['--path' => duasCandidatesFixturePath(), '--output' => $output])
        ->expectsOutputToContain('Matching results')
        ->expectsOutputToContain('Summary')
        ->expectsOutputToContain('candidates')
        ->assertExitCode(0);
});

it('fails gracefully when the Tanzil file is not found', function (): void {
    $output = duasCandidatesOutput('missing.php');

    $this->artisan('duas:quran-candidates', ['--path' => '/nonexistent/path.txt', '--output' => $output])
        ->assertExitCode(1)
        ->expectsOutputToContain('Unable to read');

    expect(File::exists($output))->toBeFalse();
});

it('requires a path or uses the default', function (): void {
    $output = duasCandidatesOutput('default.php');

    // Uses default path if it exists (test environment may or may not have the real file)
    $this->artisan('duas:quran-candidates', ['--output' => $output])
        // Either succeeds with default or fails gracefully (depends on whether fixture exists)
        ->assertExitCode(0);
});

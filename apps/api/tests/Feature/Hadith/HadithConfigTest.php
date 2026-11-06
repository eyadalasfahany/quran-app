<?php

declare(strict_types=1);

// The API key cases change process env, so each test restores what it found (see the afterEach below).

const HADITH_CONFIG_ENV_NAMES = ['APP_ENV', 'HADITH_API_KEY'];

/**
 * @return array<string, mixed>
 */
function hadithConfigFromFile(): array
{
    /** @var array<string, mixed> $config */
    $config = require config_path('hadith.php');

    return $config;
}

function hadithConfigSetEnv(string $name, string $value): void
{
    $_ENV[$name] = $value;
    $_SERVER[$name] = $value;
    putenv($name.'='.$value);
}

beforeEach(function (): void {
    $GLOBALS['hadithConfigEnvBackup'] = [];

    foreach (HADITH_CONFIG_ENV_NAMES as $name) {
        $GLOBALS['hadithConfigEnvBackup'][$name] = [
            'env' => $_ENV[$name] ?? null,
            'server' => $_SERVER[$name] ?? null,
            'process' => getenv($name),
        ];
    }
});

afterEach(function (): void {
    foreach (HADITH_CONFIG_ENV_NAMES as $name) {
        $backup = $GLOBALS['hadithConfigEnvBackup'][$name];

        if ($backup['env'] === null) {
            unset($_ENV[$name]);
        } else {
            $_ENV[$name] = $backup['env'];
        }

        if ($backup['server'] === null) {
            unset($_SERVER[$name]);
        } else {
            $_SERVER[$name] = $backup['server'];
        }

        if ($backup['process'] === false) {
            putenv($name);
        } else {
            putenv($name.'='.$backup['process']);
        }
    }
});

it('pins the full 40 character commit and never @1', function (): void {
    $config = config('hadith');

    expect($config['commit'])->toBe('df57907be35291c91ad6a6691180e22ca9920784')
        ->and($config['commit'])->toMatch('/^[0-9a-f]{40}$/')
        ->and($config['cdn_base'])->toBe('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api')
        ->and((string) file_get_contents(config_path('hadith.php')))->not->toContain('@1');
});

it('lists exactly the ten slugs in order', function (): void {
    expect(config('hadith.collections'))->toBe([
        'bukhari',
        'muslim',
        'abudawud',
        'tirmidhi',
        'ibnmajah',
        'nasai',
        'malik',
        'nawawi40',
        'qudsi40',
        'shahwaliullah40',
    ]);
});

it('has grades hidden and a constant, not an env read', function (): void {
    expect(config('hadith.grades_visible'))->toBeFalse()
        ->and((string) file_get_contents(config_path('hadith.php')))->not->toMatch('/grades_visible.*env\(/');
});

it('has no approved_collections', function (): void {
    expect(config('hadith'))->not->toHaveKey('approved_collections')
        ->and((string) file_get_contents(config_path('hadith.php')))->not->toContain('approved_collections');
});

it('names the source and keeps the shared lists empty', function (): void {
    expect(config('hadith.source_code'))->toBe('fawazahmed0')
        ->and(config('hadith.primary_source'))->toBe('fawazahmed0')
        ->and(config('hadith.slug_map'))->toBe(['fawazahmed0' => ['nawawi' => 'nawawi40', 'qudsi' => 'qudsi40', 'dehlawi' => 'shahwaliullah40']])
        ->and(config('hadith.reference_exceptions'))->toBe([]);
});

it('has the twelve file keys with null or sha256 values', function (): void {
    $files = config('hadith.files');

    expect(array_keys($files))->toBe([
        'editions.json',
        'info.json',
        'editions/ara-bukhari.json',
        'editions/ara-muslim.json',
        'editions/ara-abudawud.json',
        'editions/ara-tirmidhi.json',
        'editions/ara-ibnmajah.json',
        'editions/ara-nasai.json',
        'editions/ara-malik.json',
        'editions/ara-nawawi.json',
        'editions/ara-qudsi.json',
        'editions/ara-dehlawi.json',
    ]);

    foreach ($files as $value) {
        expect($value === null || preg_match('/^[0-9a-f]{64}$/', (string) $value) === 1)->toBeTrue();
    }
});

it('is null in production even when a key is set', function (): void {
    hadithConfigSetEnv('APP_ENV', 'production');
    hadithConfigSetEnv('HADITH_API_KEY', 'FIXTURE-KEY');

    expect(hadithConfigFromFile()['api_key'])->toBeNull();
});

it('returns the key outside production', function (): void {
    hadithConfigSetEnv('APP_ENV', 'local');
    hadithConfigSetEnv('HADITH_API_KEY', 'FIXTURE-KEY');

    expect(hadithConfigFromFile()['api_key'])->toBe('FIXTURE-KEY');
});

it('is null when the key is empty', function (): void {
    hadithConfigSetEnv('APP_ENV', 'local');
    hadithConfigSetEnv('HADITH_API_KEY', '');

    expect(hadithConfigFromFile()['api_key'])->toBeNull();
});

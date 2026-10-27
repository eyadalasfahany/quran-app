<?php

declare(strict_types=1);

use App\Support\Env;

afterEach(function (): void {
    putenv('QURAN_ENV_TEST');
    unset($_ENV['QURAN_ENV_TEST'], $_SERVER['QURAN_ENV_TEST']);
});

it('returns the default when the variable is missing', function (): void {
    expect(Env::string('QURAN_ENV_TEST', 'fallback'))->toBe('fallback');
});

it('returns a string value unchanged', function (): void {
    $_ENV['QURAN_ENV_TEST'] = 'http://localhost:8000';

    expect(Env::string('QURAN_ENV_TEST', 'fallback'))->toBe('http://localhost:8000');
});

it('rejects values env() turns into booleans', function (): void {
    $_ENV['QURAN_ENV_TEST'] = 'true';

    Env::string('QURAN_ENV_TEST', 'fallback');
})->throws(InvalidArgumentException::class, 'Environment variable [QURAN_ENV_TEST] must be a string.');

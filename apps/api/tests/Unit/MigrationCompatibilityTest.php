<?php

declare(strict_types=1);

// Local Homebrew MySQL is 9.2, which still has MD5() and SHA1(); production and CI run 9.7, which removed them (ADR 0007).
it('uses no hashing function MySQL 9.6 removed', function (string $migration): void {
    expect(file_get_contents($migration))->not->toMatch('/\b(md5|sha1?)\s*\(\s*`/i');
})->with(fn (): array => glob(__DIR__.'/../../database/migrations/*.php') ?: []);

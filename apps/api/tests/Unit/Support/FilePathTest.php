<?php

declare(strict_types=1);

use App\Support\FilePath;

it('treats a path as absolute when it starts at a root or a drive', function (string $path): void {
    expect(FilePath::isAbsolute($path))->toBeTrue();
})->with([
    'POSIX root' => '/var/data/manifest.json',
    'Windows drive, backslash' => 'D:\\projects\\manifest.json',
    'Windows drive, forward slash' => 'd:/projects/manifest.json',
    'Windows root backslash' => '\\shared\\manifest.json',
]);

it('treats a path as relative otherwise', function (string $path): void {
    expect(FilePath::isAbsolute($path))->toBeFalse();
})->with([
    'plain relative' => 'storage/manifest.json',
    'dot relative' => './storage/manifest.json',
    'drive letter without a separator' => 'D:manifest.json',
    'empty' => '',
]);

<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Tells absolute option and config paths from ones relative to the app root.
 * A path is absolute when it starts with a slash or backslash, or with a Windows drive (`D:\`, `D:/`).
 */
final class FilePath
{
    public static function isAbsolute(string $path): bool
    {
        return preg_match('#^(?:[A-Za-z]:)?[\\\\/]#', $path) === 1;
    }
}

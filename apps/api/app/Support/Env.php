<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Env as LaravelEnv;
use InvalidArgumentException;

/**
 * Typed reads for config files. env() turns "true", "false", "null" and "empty" into
 * bool, null and "", which then breaks string functions under strict_types.
 */
final class Env
{
    public static function string(string $key, string $default): string
    {
        $value = LaravelEnv::get($key, $default);

        if (! is_string($value)) {
            throw new InvalidArgumentException(sprintf('Environment variable [%s] must be a string.', $key));
        }

        return $value;
    }
}

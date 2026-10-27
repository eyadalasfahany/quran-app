<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

enum QfEnvironment: string
{
    case Prelive = 'prelive';
    case Production = 'production';

    public static function parse(string $value): self
    {
        return self::tryFrom($value) ?? throw QuranFoundationException::invalidEnvironment($value);
    }
}

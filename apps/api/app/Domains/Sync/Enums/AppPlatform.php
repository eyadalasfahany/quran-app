<?php

declare(strict_types=1);

namespace App\Domains\Sync\Enums;

enum AppPlatform: string
{
    case Ios = 'ios';
    case Android = 'android';
}

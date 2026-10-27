<?php

declare(strict_types=1);

namespace App\Domains\Sync\Enums;

enum HealthStatus: string
{
    case Ok = 'ok';
    case Unavailable = 'unavailable';
}

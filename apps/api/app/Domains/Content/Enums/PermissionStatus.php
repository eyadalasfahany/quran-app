<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

enum PermissionStatus: string
{
    case Granted = 'granted';
    case Pending = 'pending';
    case NotRequired = 'not_required';
    case Denied = 'denied';
}

<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

enum SyncEnvironment: string
{
    case Prelive = 'prelive';
    case Production = 'production';
}

<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

enum ChangeOperation: string
{
    case Upsert = 'upsert';
    case Delete = 'delete';
}

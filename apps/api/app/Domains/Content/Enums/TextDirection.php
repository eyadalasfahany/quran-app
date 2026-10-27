<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

enum TextDirection: string
{
    case Rtl = 'rtl';
    case Ltr = 'ltr';
}

<?php

declare(strict_types=1);

namespace App\Domains\Seerah\Enums;

/**
 * `event` is shown on the map; `background` is shown on the timeline and the list only (data-format.md).
 */
enum EventKind: string
{
    case Event = 'event';
    case Background = 'background';
}

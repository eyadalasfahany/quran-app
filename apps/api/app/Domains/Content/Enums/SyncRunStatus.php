<?php

declare(strict_types=1);

namespace App\Domains\Content\Enums;

enum SyncRunStatus: string
{
    case Running = 'running';
    case Ok = 'ok';
    case Failed = 'failed';
}

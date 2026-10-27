<?php

declare(strict_types=1);

namespace App\Integrations\QuranFoundation;

enum MutationType: string
{
    case ResourceCreate = 'RESOURCE_CREATE';
    case ResourceInvalidate = 'RESOURCE_INVALIDATE';
    case ResourceDelete = 'RESOURCE_DELETE';
    case ResourceUpdate = 'RESOURCE_UPDATE';
    case RowCreate = 'ROW_CREATE';
    case RowUpdate = 'ROW_UPDATE';
    case RowDelete = 'ROW_DELETE';
}

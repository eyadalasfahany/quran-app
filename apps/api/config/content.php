<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Content endpoints
    |--------------------------------------------------------------------------
    |
    | Spec section 8: content routes are limited to 300 requests per minute
    | per IP. Tests lower rate_limit_per_minute.
    |
    */

    'rate_limit_per_minute' => 300,

    /*
    |--------------------------------------------------------------------------
    | Change feed retention
    |--------------------------------------------------------------------------
    |
    | content_changes rows older than this are deleted daily. A device that
    | falls outside the remaining feed gets 410 and downloads the pack.
    |
    */

    'changes_retention_days' => 30,

];

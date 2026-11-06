<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Source cache (ADR 0068)
|--------------------------------------------------------------------------
*/

return [

    /*
    | Downloaded, pinned upstream files (snapshots, the OpenDua catalogue). Under app/private so they live on the Railway
    | volume and a deploy does not re-download them (ADR 0068). Every file is still verified against its pin before use.
    */
    'cache_root' => storage_path('app/private/sources'),

];

<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Mobile app store settings (ADR 0060)
|--------------------------------------------------------------------------
|
| The minimum app version is not configured: it is the live store version, looked up by app-stores:refresh.
| These constants identify the app in the stores.
*/

return [
    'app_store_id' => '6828097265',
    'bundle_id' => 'com.taybahapp.taybah',
    'store_url' => [
        'ios' => 'https://apps.apple.com/app/id6828097265',
        'android' => 'https://play.google.com/store/apps/details?id=com.taybahapp.taybah',
    ],
];

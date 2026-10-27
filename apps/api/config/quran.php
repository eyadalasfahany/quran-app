<?php

declare(strict_types=1);

use App\Support\Env;

return [

    /*
    |--------------------------------------------------------------------------
    | Quran Foundation
    |--------------------------------------------------------------------------
    |
    | Prelive and production stay on separate hosts. Sync jobs read this
    | config; credentials never live in the app binary.
    |
    */

    'qf' => [
        'environment' => Env::string('QF_ENV', 'prelive'),
        'client_id' => Env::string('QF_CLIENT_ID', ''),
        'client_secret' => Env::string('QF_CLIENT_SECRET', ''),
        'contact_email' => Env::string('QF_CONTACT_EMAIL', ''),
        'hosts' => [
            'prelive' => [
                'auth' => 'https://prelive-oauth2.quran.foundation',
                'api' => 'https://apis-prelive.quran.foundation/content',
            ],
            'production' => [
                'auth' => 'https://oauth2.quran.foundation',
                'api' => 'https://apis.quran.foundation/content',
            ],
        ],
        'timeout' => 30,
        'retries' => 3,
        'token_refresh_margin' => 60,
        'per_page' => 100,
    ],

];

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

    /*
    |--------------------------------------------------------------------------
    | Content sync
    |--------------------------------------------------------------------------
    |
    | One filter per resource group. The daily job and `content:sync` use
    | these unless a run passes its own resources filter.
    |
    */

    'sync' => [
        'groups' => [
            'tafsirs' => 'tafsirs:*',
            'mushafs' => 'mushafs:1',
            'chapter_recitations' => 'chapter_recitations:6,7',
        ],
    ],

    // ADR 0015: tafsir text is Arabic only. QF language_name values from the English catalogue.
    'tafsir_languages' => ['arabic'],

    // Names are not Quran text, so these may override QF's name. They clean QF's quirks:
    // Persian letters, tatweel and a trailing U+200E. The served Arabic name is the override
    // when one exists for the QF source id (resources.source_key), else the catalogue's name_ar.
    'display_names' => [
        'ar' => [
            14 => 'تفسير ابن كثير',
            93 => 'التفسير الوسيط',
            90 => 'تفسير القرطبي',
            94 => 'تفسير البغوي',
        ],
    ],

];

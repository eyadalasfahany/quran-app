<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Hadith ingestion (ADR 0042)
|--------------------------------------------------------------------------
|
| Every value here is a reviewed decision. Hadith text comes only from fawazahmed0/hadith-api, pinned to one full
| commit. Grades are stored with their graders but stay hidden. Only the dev-only API key is read from env.
*/

return [

    'source_code' => 'fawazahmed0',
    'primary_source' => 'fawazahmed0',

    // The full 40-character commit SHA. The importer fetches only this pinned revision.
    'commit' => 'df57907be35291c91ad6a6691180e22ca9920784',
    // The importer appends the pinned revision and the file path to this base, with no trailing slash.
    'cdn_base' => 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api',

    // A constant. Only a developer edit changes it; it is not read from env.
    'grades_visible' => false,

    // The ten collection slugs in their fixed order. The index plus one is the position used in the numbered fallback.
    'collections' => [
        'bukhari',
        'muslim',
        'abudawud',
        'tirmidhi',
        'ibnmajah',
        'nasai',
        'malik',
        'nawawi40',
        'qudsi40',
        'shahwaliullah40',
    ],

    // Per source: the source's collection slug mapped to the canonical slug (Sunnah.com's, checked 7 Nov 2026).
    // A slug not listed is already canonical. Edition file names keep the source's own slug.
    'slug_map' => [
        'fawazahmed0' => [
            'nawawi' => 'nawawi40',
            'qudsi' => 'qudsi40',
            'dehlawi' => 'shahwaliullah40',
        ],
    ],

    // Developer-decided exceptions to the section-range check in the importer. Empty means none.
    'reference_exceptions' => [],

    /*
    | The pinned file map: a path relative to the repository root mapped to its lowercase hex SHA-256. null means "not
    | yet recorded". The snapshot step prints the real values, and the developer approves them. The verifier must refuse
    | a download while any value is null outside tests.
    */
    'files' => [
        'editions.json' => null,
        'info.json' => null,
        'editions/ara-bukhari.json' => null,
        'editions/ara-muslim.json' => null,
        'editions/ara-abudawud.json' => null,
        'editions/ara-tirmidhi.json' => null,
        'editions/ara-ibnmajah.json' => null,
        'editions/ara-nasai.json' => null,
        'editions/ara-malik.json' => null,
        'editions/ara-nawawi.json' => null,
        'editions/ara-qudsi.json' => null,
        'editions/ara-dehlawi.json' => null,
    ],

    // Dev-only (ADR 0042 §3, §4a). Null in production, and otherwise the key only when it is a non-empty string.
    // Only hadith:match-section-titles reads it, and it is never printed.
    'api_key' => env('APP_ENV') === 'production'
        ? null
        : (is_string(env('HADITH_API_KEY')) && env('HADITH_API_KEY') !== '' ? env('HADITH_API_KEY') : null),

];

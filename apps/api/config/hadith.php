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
        'editions.json' => 'ef6eaefd10c348c500624091846d7bd7968056bea9bb15875a427d2cc2b2b3bf',
        'info.json' => 'cf1ced267ada8f606f95eb84e2b6ddfa87bfa2a6a9dd4cb2a5d9a8c1734f10fb',
        'editions/ara-bukhari.json' => 'e34a3402889ca378871da3c5984b7875c680920e93f1c8738ac7afe502179562',
        'editions/ara-muslim.json' => '194073b24090c5368e4d14a3f55c9e0ef144c7437bd7e5aa83aa4d2bc54a8ea0',
        'editions/ara-abudawud.json' => '216139c5f40a8147e700d62ffa3b5b2fe45d0e034f86941a193c598c10056189',
        'editions/ara-tirmidhi.json' => '408028cd56329ed78edbe3ad443beb96b58e16c3e5bd49f9bc7b0eac77c8820f',
        'editions/ara-ibnmajah.json' => 'b406e6be81588ab0ec1ddbed32f5fd95bbcdda242c460d88331e82eb5c2bc0aa',
        'editions/ara-nasai.json' => 'c705983c19bb089c87cd6531aff609bd94d862183ed0859115b0ff991826a956',
        'editions/ara-malik.json' => '088b1f354e110211da006d47e37dd8f8837368f318ed683271f0fdb0f09a3ab5',
        'editions/ara-nawawi.json' => '91f559b90422005b768bb449426d87d2e6fabbb43ac3a31e5c24c50ca77465e6',
        'editions/ara-qudsi.json' => '8645482e46b9ab145b3a8b740ffc7dc6902cc1cc0a1845da35b2057ec23bb55a',
        'editions/ara-dehlawi.json' => '913fa23adf0a7b62bf8a3fd80f8c8a8efc2f66ac9b7ec950443a701285193d54',
    ],

    // Dev-only (ADR 0042 §3, §4a). Null in production, and otherwise the key only when it is a non-empty string.
    // Only hadith:match-section-titles reads it, and it is never printed.
    'api_key' => env('APP_ENV') === 'production'
        ? null
        : (is_string(env('HADITH_API_KEY')) && env('HADITH_API_KEY') !== '' ? env('HADITH_API_KEY') : null),

    // Transport settings for the pinned download (step 5). Not secrets, not switches.
    'download' => [
        'timeout_seconds' => 60,
        'tries' => 3,
        'retry_delay_ms' => 1000,   // base delay; attempt n waits retry_delay_ms * 2^(n-1)
        'gap_ms' => 300,            // pause between two files in one snapshot
        'max_bytes' => 30_000_000,  // per file; ara-bukhari.json is 9.8 MB
    ],

    // Dev-only title matcher (hadith:match-section-titles, ADR 0042 §4a). Not read in production.
    'title_match' => [
        'base_url' => 'https://hadithapi.com/api',
        'timeout_seconds' => 30,
        'tries' => 3,
        'retry_delay_ms' => 1000,   // attempt n waits retry_delay_ms * 2^(n-1)
        'page_size' => 100,         // see open question 6
        'max_pages' => 2000,        // safety cap per collection
        'threshold_percent' => 95,
        // canonical slug => hadithapi.com book slug. malik and the three forty-hadith collections have no counterpart.
        'books' => [
            'bukhari' => 'sahih-bukhari',
            'muslim' => 'sahih-muslim',
            'tirmidhi' => 'al-tirmidhi',
            'abudawud' => 'abu-dawood',
            'ibnmajah' => 'ibn-e-majah',
            'nasai' => 'sunan-nasai',
        ],
    ],

    // Developer-approved section range corrections (7 Nov 2026), keyed by canonical slug and section number. The source's
    // section_details for these sections starts at 388 and 384, overlapping other books; corrected to follow the previous
    // book's last number, verified against reference.book (167/167 and 216/216 agree). Applied before books are assigned.
    'range_corrections' => [
        'muslim' => [
            '16' => ['first' => '3398', 'last' => '3567'],
            '43' => ['first' => '5938', 'last' => '6168'],
        ],
    ],

];

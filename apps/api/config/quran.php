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
            // Every QF production reciter except 173, a duplicate stream of 7 (developer, 1 Nov 2026).
            'chapter_recitations' => 'chapter_recitations:1,2,3,4,5,6,7,9,10,12,13,19,158,159,160,161,168,174,175,176',
        ],
    ],

    // QF chapter reciter id (resources.source_key for group chapter_recitations).
    // Mishari Rashid al-Afasy, Murattal.
    'default_recitation' => 7,

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

    // QF sends no Arabic name (or an ambiguous one) for these chapter reciters, keyed by QF
    // chapter reciter id (resources.source_key). Names are not Quran text. An override wins over QF's Arabic name.
    'reciter_display_names' => [
        'ar' => [
            1 => 'عبد الباسط عبد الصمد',
            4 => 'أبو بكر الشاطري',
            158 => 'عبدالله علي جابر',
            159 => 'ماهر المعيقلي',
            160 => 'بندر بليلة',
            161 => 'خليفة الطنيجي',
            168 => 'محمد صديق المنشاوي (مع الأطفال)',
            174 => 'ياسر الدوسري',
            175 => 'عبدالله حمد أبو شريدة',
            176 => 'أحمد عبدالحميد طاحون (تجريبي)',
        ],
    ],

    // Chapter reciters whose QF timings do not match their audio, keyed by QF chapter reciter id (resources.source_key).
    // Their timing rows are never stored, so the app plays them without highlight or repeat (ADR 0052). Checked on
    // 3 Nov 2026 against the audio: 158's timings drift from its file (ayah starts miss the pauses by up to 9 s, and
    // minutes of recitation follow the last timing); 168 lacks timings for most of surah 33 and one ayah of 36 and of
    // 101; 174's ayah starts scatter by about 4 s and end 6–8 s after the audio; 5 drifts proportionally (~2 s by the
    // end of a long surah).
    'untrusted_timing_recitations' => [5, 158, 168, 174],

    // QF has no Arabic author field, so the served Arabic author is this override by QF source id
    // (resources.source_key). Credits are not Quran text. Other tafsirs serve no Arabic author.
    'display_authors' => [
        'ar' => [
            14 => 'ابن كثير',
            90 => 'القرطبي',
            93 => 'محمد سيد طنطاوي',
            94 => 'البغوي',
            926 => 'جلال الدين المحلي والسيوطي',
        ],
    ],

];

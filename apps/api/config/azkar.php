<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Azkar ingestion (ADR 0031)
|--------------------------------------------------------------------------
|
| Every value here is a reviewed decision, not a guess. Empty maps mean "not reviewed yet":
| a missing title stays null, and a Quran passage without a reference row fails the import.
*/

return [

    'opendua' => [
        // §1: the pinned upstream release. A file with another SHA-256 is refused, whatever its version says.
        'version' => '0.0.4',
        'catalogue_sha256' => '231dfca7b1d0b5bea8ead8125c8d556121a115c40c9e348e08f4b3ede5194958',
        'source_code' => 'opendua',
        'collection_id' => 'hisn-al-muslim',
        'source_key' => 'hisn-al-muslim',
        // §1: the pinned file's public URL. The download is verified against catalogue_sha256 before use.
        'catalogue_url' => 'https://opendua.hdfund.org/v0.0.4/catalogue.json',
        // Milliseconds between download attempts. Tests set it to 0.
        'retry_delay_ms' => 1000,
        // §1, ADR 0038: the production import lock. The source is granted; this flag and the reviewed Quran map keep production locked.
        'import_enabled' => (bool) env('AZKAR_OPENDUA_IMPORT_ENABLED', false),
        // §5: English and transliteration are stored only when the licence covers them. Default off.
        'store_english' => false,
        // §8: recordings are imported only with verified rights. Default off.
        'audio_rights_verified' => false,
    ],

    // §8: rights for imported recordings. Read only when audio_rights_verified is true.
    'recording_rights' => [
        'stream_allowed' => false,
        'download_allowed' => false,
        'redistribution_allowed' => false,
        'attribution_ar' => null,
        'attribution_en' => null,
        'licence' => null,
        'licence_url' => null,
        // ISO 8601 date the rights were verified in writing, or null.
        'rights_verified_at' => null,
    ],

    // §4 and the Arabic title rule, keyed by chapter number. Source: hisnmuslim.com, the book's own site, from the pinned
    // 2026-11-01 snapshot (azkar.hisnmuslim.snapshot_sha256), copied as received. Every chapter's book dua numbers match
    // OpenDua's chapter of the same number (developer decision, 1 Nov 2026; ADR 0031 release blocker 2).
    'chapter_titles_ar' => [
        1 => 'أذكار الاستيقاظ من النوم',
        2 => 'دعاء ُلبْس الثوب',
        3 => 'دعاء ُلبْس الثوب الجديد',
        4 => 'الدعاء لمن لبس ثوبا جديدا',
        5 => 'ما يقول إذا وضع ثوبه',
        6 => 'دعاء دخول الخلاء',
        7 => 'دعاء الخروج من الخلاء',
        8 => 'الذكر قبل الوضوء',
        9 => 'الذكر بعد الفراغ من الوضوء',
        10 => 'الذكر عند الخروج من المنزل',
        11 => 'الذكر عند دخول المنزل',
        12 => 'دعاء الذهاب إلى المسجد',
        13 => 'دعاء دخول المسجد',
        14 => 'دعاء الخروج من المسجد',
        15 => 'أذكار الآذان',
        16 => 'دعاء الاستفتاح',
        17 => 'دعاء الركوع',
        18 => 'دعاء الرفع من الركوع',
        19 => 'دعاء السجود',
        20 => 'دعاء الجلسة بين السجدتين',
        21 => 'دعاء سجود التلاوة',
        22 => 'التشهد',
        23 => 'الصلاة على النبي بعد التشهد',
        24 => 'الدعاء بعد التشهد الأخير قبل السلام',
        25 => 'الأذكار بعد السلام من الصلاة',
        26 => 'دعاء صلاة الاستخارة',
        27 => 'أذكار الصباح والمساء',
        28 => 'أذكار النوم',
        29 => 'الدعاء إذا تقلب ليلا',
        30 => 'دعاء الفزع في النوم و من بُلِيَ بالوحشة',
        31 => 'ما يفعل من رأى الرؤيا أو الحلم',
        32 => 'دعاء قنوت الوتر',
        33 => 'الذكر عقب السلام من الوتر',
        34 => 'دعاء الهم والحزن',
        35 => 'دعاء الكرب',
        36 => 'دعاء لقاء العدو و ذي السلطان',
        37 => 'دعاء من خاف ظلم السلطان',
        38 => 'الدعاء على العدو',
        39 => 'ما يقول من خاف قوما',
        40 => 'دعاء من أصابه وسوسة في الإيمان',
        41 => 'دعاء قضاء الدين',
        42 => 'دعاء الوسوسة في الصلاة و القراءة',
        43 => 'دعاء من استصعب عليه أمر',
        44 => 'ما يقول ويفعل من أذنب ذنبا',
        45 => 'دعاء طرد الشيطان و وساوسه',
        46 => 'الدعاء حينما يقع ما لا يرضاه أو ُ غلب على أمره',
        47 => 'ﺗﻬنئة المولود له وجوابه',
        48 => 'ما يعوذ به الأولاد',
        49 => 'الدعاء للمريض في عيادته',
        50 => 'فضل عيادة المريض',
        51 => 'دعاء المريض الذي يئس من حياته',
        52 => 'تلقين المحتضر',
        53 => 'دعاء من أصيب بمصيبة',
        54 => 'الدعاء عند إغماض الميت',
        55 => 'الدعاء للميت في الصلاة عليه',
        56 => 'الدعاء للفرط في الصلاة عليه',
        57 => 'دعاء التعزية',
        58 => 'الدعاء عند إدخال الميت القبر',
        59 => 'الدعاء بعد دفن الميت',
        60 => 'دعاء زيارة القبور',
        61 => 'دعاء الريح',
        62 => 'دعاء الرعد',
        63 => 'من أدعية الاستسقاء',
        64 => 'الدعاء إذا نزل المطر',
        65 => 'الذكر بعد نزول المطر',
        66 => 'من أدعية الاستصحاء',
        67 => 'دعاء رؤية الهلال',
        68 => 'الدعاء عند إفطار الصائم',
        69 => 'الدعاء قبل الطعام',
        70 => 'الدعاء عند الفراغ من الطعام',
        71 => 'دعاء الضيف لصاحب الطعام',
        72 => 'التعريض بالدعاء لطلب الطعام أو الشراب',
        73 => 'الدعاء إذا أفطر عند أهل بيت',
        74 => 'دعاء الصائم إذا حضر الطعام ولم يفطر',
        75 => 'ما يقول الصائم إذا سابه أحد',
        76 => 'الدعاء عند رؤية باكورة الثمر',
        77 => 'دعاء العطاس',
        78 => 'ما يقال للكافر إذا عطس فحمد الله',
        79 => 'الدعاء للمتزوج',
        80 => 'دعاء المتزوج و شراء الدابة',
        81 => 'الدعاء قبل إتيان الزوجة',
        82 => 'دعاء الغضب',
        83 => 'دعاء من رأى مبتلى',
        84 => 'ما يقال في اﻟﻤﺠلس',
        85 => 'كفارة اﻟﻤﺠلس',
        86 => 'الدعاء لمن قال غفر الله لك',
        87 => 'الدعاء لمن صنع إليك معروفا',
        88 => 'ما يعصم الله به من الدجال',
        89 => 'الدعاء لمن قال إني أحبك في الله',
        90 => 'الدعاء لمن عرض عليك ماله',
        91 => 'الدعاء لمن أقرض عند القضاء',
        92 => 'دعاء الخوف من الشرك',
        93 => 'الدعاء لمن قال بارك الله فيك',
        94 => 'دعاء كراهية الطيرة',
        95 => 'دعاء الركوب',
        96 => 'دعاء السفر',
        97 => 'دعاء دخول القرية أو البلدة',
        98 => 'دعاء دخول السوق',
        99 => 'الدعاء إذا تعس المركوب',
        100 => 'دعاء المسافر للمقيم',
        101 => 'دعاء المقيم للمسافر',
        102 => 'التكبير و التسبيح في سير السفر',
        103 => 'دعاء المسافر إذا أسحر',
        104 => 'الدعاء إذا نزل مترلا في سفر أو غيره',
        105 => 'ذكر الرجوع من السفر',
        106 => 'ما يقول من أتاه أمر يسره أو يكرهه',
        107 => 'فضل الصلاة على النبي صلى الله عليه و سلم',
        108 => 'إفشاء السلام',
        109 => 'كيف يرد السلام على الكافر إذا سلم',
        110 => 'الدُّعاءُ عِنْدَ سَمَاعِ صِياحِ الدِّيكِ ونَهِيقِ الْحِمَارِ',
        111 => 'دعاء نباح الكلاب بالليل',
        112 => 'الدعاء لمن سببته',
        113 => 'ما يقول المسلم إذا مدح المسلم',
        114 => 'ما يقول المسلم إذا زكي',
        115 => 'كيف يلبي المحرم في الحج أو العمرة ؟',
        116 => 'التكبير إذا أتى الركن الأسود',
        117 => 'الدعاء بين الركن اليماني والحجر الأسود',
        118 => 'دعاء الوقوف على الصفا والمروة',
        119 => 'الدعاء يوم عرفة',
        120 => 'الذكر عند المشعر الحرام',
        121 => 'التكبير عند رمي الجمار مع كل حصاة',
        122 => 'دعاء التعجب والأمر السار',
        123 => 'ما يفعل من أتاه أمر يسره',
        124 => 'ما يقول من أحس وجعا في جسده',
        125 => 'دعاء من خشي أن يصيب شيئا بعينه',
        126 => 'ما يقال عند الفزع',
        127 => 'ما يقول عند الذبح أو النحر',
        128 => 'ما يقول لرد كيد مردة الشياطين',
        129 => 'الاستغفار و التوبة',
        130 => 'فضل التسبيح و التحميد، و التهليل، و التكبير',
        131 => 'كيف كان النبي يسبح؟',
        132 => 'من أنواع الخير والآداب الجامعة',
    ],

    // ADR 0031 §11 (amended 1 Nov 2026): entries left out of every import, production included, until their Quran
    // passages are identified and reviewed. Keyed by entry_key; the value is the reason, shown in the import report.
    'excluded_entries' => [
        'hisn-al-muslim:entry-000050' => 'quran_reference_unidentified',
        'hisn-al-muslim:entry-000070' => 'quran_reference_unidentified',
        'hisn-al-muslim:entry-000076' => 'quran_reference_unidentified',
        'hisn-al-muslim:entry-000099' => 'quran_reference_unidentified',
        'hisn-al-muslim:entry-000110' => 'quran_reference_unidentified',
        'hisn-al-muslim:entry-000206' => 'quran_reference_unidentified',
        'hisn-al-muslim:entry-000207' => 'quran_reference_unidentified',
        'hisn-al-muslim:entry-000235' => 'quran_reference_unidentified',
        'hisn-al-muslim:entry-000236' => 'quran_reference_unidentified',
    ],

    // §7: occasion and timing from each chapter's own title. Chapters not listed keep every field null.
    'chapter_timing' => [
        1 => ['occasion' => 'after_waking', 'timing_type' => 'event_based', 'timing_prayer' => null],
        10 => ['occasion' => 'leaving_home', 'timing_type' => 'event_based', 'timing_prayer' => null],
        11 => ['occasion' => 'entering_home', 'timing_type' => 'event_based', 'timing_prayer' => null],
        13 => ['occasion' => 'entering_mosque', 'timing_type' => 'event_based', 'timing_prayer' => null],
        14 => ['occasion' => 'leaving_mosque', 'timing_type' => 'event_based', 'timing_prayer' => null],
        25 => ['occasion' => 'after_prayer', 'timing_type' => 'prayer_based', 'timing_prayer' => null],
        27 => ['occasion' => null, 'timing_type' => 'time_period', 'timing_prayer' => null],
        28 => ['occasion' => 'before_sleep', 'timing_type' => 'event_based', 'timing_prayer' => null],
        96 => ['occasion' => 'travel', 'timing_type' => 'event_based', 'timing_prayer' => null],
    ],

    /*
    | §6 Display categories. Session categories are pinned to chapters. Chapter 27 uses its upstream
    | 'morning' and 'evening' variations; 'standard' entries belong to both.
    */
    'session_categories' => [
        'morning' => ['chapter' => 27, 'variation' => 'morning', 'occasion' => null],
        'evening' => ['chapter' => 27, 'variation' => 'evening', 'occasion' => null],
        'after_prayer' => ['chapter' => 25, 'variation' => null, 'occasion' => 'after_prayer'],
        'before_sleep' => ['chapter' => 28, 'variation' => null, 'occasion' => 'before_sleep'],
        'after_waking' => ['chapter' => 1, 'variation' => null, 'occasion' => 'after_waking'],
    ],

    /*
    | ADR 0031 §12. The primary source supplies the canonical catalogue. The other source is used only to cross-verify.
    | opendua is the default until the developer chooses otherwise.
    */
    'primary_source' => env('AZKAR_PRIMARY_SOURCE', 'opendua'),

    /*
    | hisnmuslim.com (ADR 0031 §12). Locked in production until written permission arrives, like OpenDua: its own
    | content_sources row, its own import flag, and its own snapshot pin. The snapshot is fetched politely (sequential,
    | a gap between requests) and verified against the pinned manifest SHA-256 before an import uses it.
    */
    'hisnmuslim' => [
        'code' => 'hisnmuslim',
        'index_url' => 'https://www.hisnmuslim.com/api/ar/husn_ar.json',
        'chapter_url' => 'https://www.hisnmuslim.com/api/ar/{id}.json',
        'gap_ms' => 300,
        'retry_delay_ms' => 1000,
        'import_enabled' => (bool) env('AZKAR_HISNMUSLIM_IMPORT_ENABLED', false),
        // The pin: the snapshot date and the SHA-256 of its whole manifest. Set by `azkar:snapshot hisnmuslim`.
        'snapshot_date' => '2026-11-01',
        'snapshot_sha256' => '6d87857bc527bb2466497439b2fe62c875fa9732d3c7fd1df995d60c1606adec',
    ],
    /*
    | ADR 0031 §12. HadeethEnc enriches entries with explanation, grade and reference notes. Locked: its content_sources
    | row must be granted AND AZKAR_HADEETHENC_ENABLED on. The snapshot is pinned like the others.
    */
    'hadeethenc' => [
        'code' => 'hadeethenc',
        'api_base' => 'https://hadeethenc.com/api/v1',
        'site_url' => 'https://hadeethenc.com/ar/browse/hadith/',
        'language' => 'ar',
        // Categories 301 and 268 with its children, plus 278, 279, 299, 300 (step-13 §4).
        'category_ids' => [301, 268, 278, 279, 299, 300],
        'per_page' => 100,
        'gap_ms' => 300,
        'retry_delay_ms' => 1000,
        'enabled' => (bool) env('AZKAR_HADEETHENC_ENABLED', false),
        // A dhikr shorter than this (normalised characters) is not linked: short phrases occur in many hadiths.
        'min_match_chars' => 40,
        'snapshot_date' => '2026-11-01',
        'snapshot_sha256' => '454bc9326ff2a3a3b6cf25d9913227616748b3042f748d498bfc5b81288c1edb',
    ],
    'progress_period' => 'session',

    /*
    | §4 Quran references, keyed by item_key (<entry_key>:<variation id>:<n>). One row per ﴿…﴾ span, in order:
    | [surah, verse_from, verse_to|null, 'status' => ..., 'evidence' => ...]. Generated by
    | `azkar:quran-map-candidates`; the developer marks rows `reviewed`. See azkar_quran_map.php and
    | QuranReferencePolicy for which statuses each environment accepts.
    */
    'quran_references' => array_merge(require __DIR__.'/azkar_quran_map.php', require __DIR__.'/azkar_hisnmuslim_quran_map.php'),

];

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
        // §1: production import stays locked until OpenDua confirms the rights in writing.
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

    // §4 and the Arabic title rule: keyed by chapter number. Empty until a permitted named source is approved.
    'chapter_titles_ar' => [],

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

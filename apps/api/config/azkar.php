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

    'progress_period' => 'session',

    /*
    | §6 Reviewed Quran references, keyed by item_key (<entry_key>:<variation id>:<n>). Each row is one
    | ﴿…﴾ span in order: [surah, verse_from, verse_to|null]. Empty until reviewed (17 strings, ADR 0031 §4).
    */
    'quran_references' => [],

];

<?php

declare(strict_types=1);

/*
 * The pinned quran-svg source for the SVG mushafs, and the pinned quran-text source for their per-word page and line layout
 * (ADR 0090). Every value is a reviewed decision; nothing is read from env.
 */
return [

    'repository' => 'quran-ws/quran-svg',
    'tag' => 'v1.1.1',
    'commit' => '3ff27b46cecb0c0519d77531d9c868a579d1f623',
    'raw_base' => 'https://raw.githubusercontent.com/quran-ws/quran-svg',
    'manifest' => 'svg-mushaf/quran-svg-v1.1.1.json', // relative to resource_path()
    'pages' => 604,

    // App key => source folder, print year (Hijri), expected total ayahs (null = check against surah.json only). The names are
    // display names for the pack's resource row (ADR 0090 decision 2), not Quran text. `publish` false hides an edition from
    // mushaf:setup and from mushaf:publish (ADR 0090 item 12); `mushaf:publish --include-hidden` publishes it locally only.
    'editions' => [
        'hafs' => ['folder' => 'hafs', 'edition_year' => 1441, 'expected_ayahs' => 6236, 'name' => 'Hafs from Asim', 'name_ar' => 'حفص عن عاصم', 'publish' => true],
        'warsh' => ['folder' => 'warsh', 'edition_year' => 1442, 'expected_ayahs' => null, 'name' => 'Warsh from Nafi', 'name_ar' => 'ورش عن نافع', 'publish' => true],
        'qalun' => ['folder' => 'qalon', 'edition_year' => 1443, 'expected_ayahs' => null, 'name' => 'Qalun from Nafi', 'name_ar' => 'قالون عن نافع', 'publish' => true],
        'shubah' => ['folder' => 'shubah', 'edition_year' => 1443, 'expected_ayahs' => null, 'name' => "Shu'bah from Asim", 'name_ar' => 'شعبة عن عاصم', 'publish' => true],
        'duri' => ['folder' => 'douri', 'edition_year' => 1443, 'expected_ayahs' => null, 'name' => 'Al-Duri from Abu Amr', 'name_ar' => 'الدوري عن أبي عمرو', 'publish' => false],
    ],

    // quran-ws/quran-text: one row per word with its page and line (`data/mushaf/{key}.csv.gz`). Only keys, page, line,
    // position_in_ayah and the letter count of rasm_imlai are read; no text is kept.
    'quran_text' => [
        'repository' => 'quran-ws/quran-text',
        'commit' => '7bdefdead812bc2020644b3be91f22c875a70827',
        'raw_base' => 'https://raw.githubusercontent.com/quran-ws/quran-text',
        'manifest' => 'svg-mushaf/quran-text-7bdefde.json', // relative to resource_path()
    ],

    // mushaf:build-word-boxes (ADR 0090 decisions 5 and 6). Every value enters the build digest, so changing one needs a new review.
    'word_boxes' => [
        // A contour this share of the band height or taller is a letter body, not a mark. Lowered from the spike's 0.30 (12 Nov
        // 2026): 65 of the 96 words that had no full-height contour at 0.30 are short words whose tallest letter is 25-30% of the
        // line. At 0.25, W2 falls from 162 to 14 words and W8 from 661 to 207 lines; marks stay below it.
        'base_height_share' => 0.25,
        'no_base_penalty' => 1000.0,
        'out_of_span_penalty' => 500.0,
        // Cost per full-height contour more or fewer than a word's letter bodies (counted from its printed text). 0 turns it off.
        'body_penalty' => (float) env('MUSHAF_BODY_PENALTY', 0.0),
        // For the body count only: a contour shorter than full height still counts as a letter body when it is at least this
        // share of the line high and crosses the level this share of the line above the baseline (a short dal or ra does; marks
        // float above or below the baseline and do not).
        'body_min_share' => 0.2,
        'body_baseline_share' => 0.12,
        'span_tolerance' => 0.5,
        'polygon_snap' => 5.0, // pages 1-2 only: polygon corners this close in y are one line edge
        // A line's path is cut where a contour's x-centre falls back by more than this. 120 rather than 60: W2 162 against 156,
        // but W8 661 lines against 935, because 60 also cuts inside long words.
        'line_order_jump' => 120.0,
        // quran-text word => how many app words it covers. The app counts Tanzil's letter tokens; quran-text writes the first two
        // of 15:7 as one word, so that box serves both and every later word of the ayah moves up one.
        'position_splits' => ['15:7:1' => 2],
        // W4 and W5, calibrated on the 604 Hafs pages (12 Nov 2026) over the boxes of lines nothing else flags, with letters
        // counted in quran-text's imlāʾī spelling: min_width is the 1st percentile of box widths (6.05); low and high are the
        // 0.5th and 99.5th percentiles of width per letter as a multiple of the page median (0.173 and 3.335).
        'min_width' => 6.0,
        'width_per_letter' => ['low' => 0.17, 'high' => 3.3],
        'review_sample' => 30,
    ],

    // The build's output and the reviewer's corrections, relative to resource_path() (or absolute). %s is the edition key. Not
    // part of the digest: the output carries the digest, and the corrections change the boxes, which are in it.
    'word_box_files' => [
        'output' => 'svg-mushaf/word-boxes-%s.json',
        'overrides' => 'svg-mushaf/word-box-overrides-%s.json',
        'contour_output' => 'svg-mushaf/word-contours-%s.json',
    ],

    // The reviewed word-box digest per edition. Only the developer sets it, after checking every page of the review sheet.
    // Hafs: approved by the developer on 15 Nov 2026 (review sheet v3, every box matching the app's word index).
    'approved_word_boxes' => [
        'hafs' => '8944a6b3f72874e9a77ea8e708f7d06b68f6741ee55f1d606167870835a04553',
    ],

    // The reviewed contour-map digest per edition (ADR 0090 step 13 A3, decision 7). Set only by the developer after the review
    // sheet of step 13 C0. Not approved yet: the map stays pending_review until then.
    'approved_word_contours' => [],

];

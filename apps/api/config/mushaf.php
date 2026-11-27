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
        'warsh' => ['folder' => 'warsh', 'edition_year' => 1442, 'expected_ayahs' => 6214, 'name' => 'Warsh from Nafi', 'name_ar' => 'ورش عن نافع', 'publish' => true],
        'qalun' => ['folder' => 'qalon', 'edition_year' => 1443, 'expected_ayahs' => 6214, 'name' => 'Qalun from Nafi', 'name_ar' => 'قالون عن نافع', 'publish' => true],
        'shubah' => ['folder' => 'shubah', 'edition_year' => 1443, 'expected_ayahs' => 6236, 'name' => "Shu'bah from Asim", 'name_ar' => 'شعبة عن عاصم', 'publish' => true],
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
        // Cost per letter body more or fewer than a word's text has (ADR 0090 items 14 and 16; approved by the developer, 27 Nov
        // 2026). 0 turns the letter-body rules off.
        'body_penalty' => 6.0,
        // For the body count only: a contour shorter than full height still counts as a letter body when it is at least this
        // share of the line high and crosses the level this share of the line above the baseline (a short dal or ra does; marks
        // float above or below the baseline and do not).
        'body_min_share' => 0.2,
        'body_baseline_share' => 0.12,
        // Keep-together runs for the zoomed layout: a word at most `join_narrow` x the page's median width per letter that has
        // fewer letter bodies than its text, next to a word at least `join_wide` x that median, is drawn joined to it.
        'join_narrow' => 0.7,
        'join_wide' => 1.4,
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
    // The riwayat whose words are followed word by word (ADR 0090 amendment item 10, step 14), and what differs per riwayah.
    // Hafs keeps its settings in `word_boxes` above (its approved digest hashes that block); the others add theirs here:
    // `position_splits` (none: their positions are quran-text's own), `debris_extent` (a content contour this small in both
    // directions is source debris: left out of the split and the box, attached as a loose contour to the nearest word) and
    // `width_per_letter` (W5 flags only; Hafs' values until calibrated on a riwayah's first run) and `body_penalty` (the
    // letter-body rules of ADR 0090 item 14, on for these from their first build; Hafs reads `word_boxes.body_penalty`, 0 until
    // the developer approves its revised split). al-Duri waits for the
    // developer's numbering decision (step 14, RB-A) and is not listed.
    'word_box_riwayat' => [
        'hafs' => [],
        'shubah' => ['body_penalty' => 6.0, 'position_splits' => [], 'debris_extent' => 0.03, 'width_per_letter' => ['low' => 0.17, 'high' => 3.3]],
        'warsh' => ['body_penalty' => 6.0, 'position_splits' => [], 'debris_extent' => 0.03, 'width_per_letter' => ['low' => 0.17, 'high' => 3.3]],
        'qalun' => ['body_penalty' => 6.0, 'position_splits' => [], 'debris_extent' => 0.03, 'width_per_letter' => ['low' => 0.17, 'high' => 3.3]],
    ],

    // Approved by the developer, 27 Nov 2026 (ADR 0090 items 14 and 16): Hafs's revised split, and Shu'bah, Warsh and Qalun as built.
    'approved_word_boxes' => [
        'hafs' => '01adf3d1719083ed1a3b96a399e240039d7b6d46bf6c410ab06ffca6046a2d46',
        'shubah' => '8c9e4fafbde2cfa163b2eb55691b9549751b3ffb607424507e59af5fe21503e4',
        'warsh' => '465a909b1f85f97865215803b5fe4efb5cea66a835455beccdc852807c53d630',
        'qalun' => 'a81d626f742ae89600517702a57789f1229e808564926dd7450daf728a7fc53f',
    ],

    // The reviewed contour-map digest per edition (ADR 0090 step 13 A3, decision 7). Set only by the developer after the review
    // sheet of step 13 C0. Approved by the developer, 27 Nov 2026 (ADR 0090 items 14 and 16).
    'approved_word_contours' => [
        'hafs' => '2b9916fadcb1f2ca528680162cbdbaa31560c28d171860e61a6838d7e57c24c3',
        'shubah' => '7c69111316900326a6ef424836fca6bd0d05f01f3380a1b822648c752d2ea3a2',
        'warsh' => '3ba7359df70335e1ad3060d507edcc95d6a81bc6e51f624a6877c8b3d2b576e7',
        'qalun' => '51a5df6f737dbf83e5c8d7b6c527b431841ece99147cf4a9f555defbd133ee29',
    ],

];

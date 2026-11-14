<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Seerah book source and canonical text (ADR 0089, Phase 8 steps 2 and 3)
|--------------------------------------------------------------------------
|
| Every value here is a reviewed pin. The book text comes only from the OpenITI file below (the Shamela edition, book 23692),
| pinned to one full commit and to the SHA-256 of the file. The canonical text is the file with the closed list of removals in
| ADR 0089 §3, derived on every run by seerah:canonicalize; its SHA-256 is pinned in `canonical_sha256`. A pin is changed only by
| a developer edit. Nothing here is read from env.
*/

return [

    'book' => [
        'slug' => 'nur-al-yaqin',
        'title_ar' => 'نور اليقين في سيرة سيد المرسلين',
        'author_ar' => 'محمد بن عفيفي الباجوري، المعروف بالشيخ الخضري',
        'edition_ar' => 'دار الفيحاء - دمشق، الطبعة الثانية 1425 هـ (Shamela 23692)',
    ],

    'source' => [
        'code' => 'openiti',
        'version' => 'Shamela0023692-ara1',
        'repository' => 'OpenITI/1350AH',
        // The full 40-character commit SHA. The file below was fetched at this ref only.
        'ref' => '6d0c197e84a46a3cadbd36a045d09cb2bc9aa71e',
        'path' => 'data/1345IbnCafifiKhudari/1345IbnCafifiKhudari.NurYaqin/1345IbnCafifiKhudari.NurYaqin.Shamela0023692-ara1',
        'url' => 'https://raw.githubusercontent.com/OpenITI/1350AH/6d0c197e84a46a3cadbd36a045d09cb2bc9aa71e/data/1345IbnCafifiKhudari/1345IbnCafifiKhudari.NurYaqin/1345IbnCafifiKhudari.NurYaqin.Shamela0023692-ara1',
        'licence' => 'CC BY-NC-SA 4.0',
        // Relative to database/. The committed copy is byte for byte the file at `path` above; it is never edited.
        'file' => 'data/seerah/source/1345IbnCafifiKhudari.NurYaqin.Shamela0023692-ara1',
        'bytes' => 667755,
        'sha256' => '5d9bbdbd7b3c17f361383a79825fa08bfbdad5848a48436d3173af383cb1895c',
        'metadata_file' => 'data/seerah/source/1345IbnCafifiKhudari.NurYaqin.Shamela0023692-ara1.yml',
        'metadata_sha256' => 'f6c11954238c3ebab3076df8536f18d8567f43b41230d1167fa6f79e7eb0273b',
    ],

    /*
    | The exact titles of the front-matter headings (the editor's preface and the opening formula), in book order. They are
    | the level `front` in book/structure.json; every other heading is `heading`. A change of title fails the canonicalizer.
    */
    'front_headings' => [
        'مقدمة الطبعة الثالثة',
        'بسم الله الرحمن الرحيم',
    ],

    /*
    | The review batches (Phase 8 step 4, data-format.md): section ids, inclusive, in book order. E1 starts after the two front
    | sections; E4 ends at the last section. `start_title` is the exact heading of `from`; V13 checks it, so a moved id fails.
    | The front sections s001 and s002 belong to no batch: they are excluded as front matter.
    */
    'batches' => [
        'E1' => ['from' => 's003', 'to' => 's019', 'start_title' => 'النسب الشريف', 'period' => "Makkah before the Bi'tha"],
        'E2' => ['from' => 's020', 'to' => 's044', 'start_title' => 'بدء الوحي', 'period' => "Makkah after the Bi'tha"],
        'E3' => ['from' => 's045', 'to' => 's116', 'start_title' => 'هجرة المسلمين إلى المدينة', 'period' => 'The Hijra and years 1 to 5'],
        'E4' => ['from' => 's117', 'to' => 's258', 'start_title' => 'السنة السادسة', 'period' => 'Years 6 to 11 and the death'],
    ],

    /*
    | The year headings of the book and the Hijri year each one names (ADR 0089, data-format.md V12). A section after a year heading
    | and before the next one belongs to that year. The heading «السنة الأولى» is the first Hijri year (age 53).
    */
    'year_headings' => [
        'السنة الأولى' => 1,
        'السنة الثانية' => 2,
        'السنة الثالثة' => 3,
        'السنة الرابعة' => 4,
        'السنة الخامسة' => 5,
        'السنة السادسة' => 6,
        'السنة السابعة' => 7,
        'السنة الثامنة' => 8,
        'السنة التاسعة' => 9,
        'السنة العاشرة' => 10,
        'السنة الحادية عشرة' => 11,
    ],

    /*
    | The age axis (Q6, provisional convention checked by V11): age 53 is the first Hijri year, age 52 the year before the Hijra
    | (1 ق.هـ). Age 0 to 63 is the whole timeline.
    */
    'age' => ['min' => 0, 'max' => 63, 'hijra_age' => 53],

    /* The six milestone keys of milestones.json (V15). */
    'milestones' => ['birth', 'bitha', 'hijra', 'badr', 'fath', 'death'],

    /* The plausible box for every coordinate (V6), in degrees: south, west, north, east. */
    'geo_box' => ['south' => 10.0, 'west' => 30.0, 'north' => 38.0, 'east' => 60.0],

    /*
    | The release pins of the counts (V19). CI fails when the committed data changes a count without a developer edit here.
    | Sections and paragraphs come from book/structure.json; the rest from the data folder.
    */
    'counts' => [
        'sections' => 258,
        'paragraphs' => 1087,
        'places' => 2,
        'exclusions' => 0,
        'routes' => 0,
        'milestones' => 0,
        'events' => ['E1' => 0, 'E2' => 0, 'E3' => 0, 'E4' => 0],
    ],

    /*
    | The SHA-256 of the canonical text (seerah:canonicalize prints it). Pinned after the first green run of the step 3 report; a change
    | needs a developer edit after reading the new report. A command run that changes the canonical text fails until this pin is changed.
    */
    'canonical_sha256' => '67a42abe6490692d6f77f6749ea2ae9a3def5fddff4bd53872e820a285f7481a',
];

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
    | The SHA-256 of the canonical text (seerah:canonicalize prints it). Pinned after the first green run of the step 3 report; a change
    | needs a developer edit after reading the new report. A command run that changes the canonical text fails until this pin is changed.
    */
    'canonical_sha256' => '67a42abe6490692d6f77f6749ea2ae9a3def5fddff4bd53872e820a285f7481a',
];

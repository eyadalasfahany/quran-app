<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Seerah book source and canonical text (ADR 0089, Phase 8 steps 2 and 3)
|--------------------------------------------------------------------------
|
| Every value here is a reviewed pin. The book text comes only from the OpenITI file below, pinned to one full commit and to
| the SHA-256 of the file. The canonical text is the file with the closed list of removals in ADR 0089 §3, derived on every run
| by seerah:canonicalize; its SHA-256 is pinned in `canonical_sha256`. A pin is changed only by a developer edit. Nothing here
| is read from env.
*/

return [

    'book' => [
        'slug' => 'nur-al-yaqin',
        'title_ar' => 'نور اليقين في سيرة سيد المرسلين',
        'author_ar' => 'الشيخ محمد الخضري',
        'edition_ar' => 'مكتبة الإيمان، المنصورة، الطبعة الأولى 1419هـ / 1999م؛ تحقيق أحمد محمود خطاب',
    ],

    'source' => [
        'code' => 'openiti',
        'version' => 'JK009247-ara1',
        'repository' => 'OpenITI/1350AH',
        // The full 40-character commit SHA. The file below was fetched at this ref only.
        'ref' => '6d0c197e84a46a3cadbd36a045d09cb2bc9aa71e',
        'path' => 'data/1345IbnCafifiKhudari/1345IbnCafifiKhudari.NurYaqin/1345IbnCafifiKhudari.NurYaqin.JK009247-ara1',
        'url' => 'https://raw.githubusercontent.com/OpenITI/1350AH/6d0c197e84a46a3cadbd36a045d09cb2bc9aa71e/data/1345IbnCafifiKhudari/1345IbnCafifiKhudari.NurYaqin/1345IbnCafifiKhudari.NurYaqin.JK009247-ara1',
        'licence' => 'CC BY-NC-SA 4.0',
        // Relative to database/. The committed copy is byte for byte the file at `path` above; it is never edited.
        'file' => 'data/seerah/source/1345IbnCafifiKhudari.NurYaqin.JK009247-ara1',
        'bytes' => 695291,
        'sha256' => 'f8ce38b36f31cebe428ccda6e80be8561a11b615acdec0e6db55370a37443683',
        'metadata_file' => 'data/seerah/source/1345IbnCafifiKhudari.NurYaqin.JK009247-ara1.yml',
        'metadata_sha256' => '55d7ea5bb4eaf2903695f232c50ae82becffc08e1e8d6878946f13974311e8f3',
    ],

    /*
    | The SHA-256 of the canonical text (seerah:canonicalize prints it). Null until the first green run; the developer pins it
    | after reading the section report. A command run that changes the canonical text fails until this pin is changed.
    */
    'canonical_sha256' => null,
];

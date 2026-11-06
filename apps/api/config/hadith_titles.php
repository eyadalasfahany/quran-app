<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Hadith titles (ADR 0042 §4a)
|--------------------------------------------------------------------------
|
| Data only. Collection names come from ummahapi.com, and the Arabic authors were approved by the developer on
| 1 Nov 2026. A null name or author stays null: the UI shows the numbered fallback, never an invented title.
| Section titles stay empty until the developer approves a proposal from hadith:match-section-titles.
*/

return [

    'collections' => [
        'bukhari' => [
            'title_ar' => 'صحيح البخاري',
            'title_ar_source' => 'ummahapi.com',
            'author_ar' => 'الإمام محمد بن إسماعيل البخاري',
            'author_ar_source' => 'developer',
            'author_ar_status' => 'approved',
        ],
        'muslim' => [
            'title_ar' => 'صحيح مسلم',
            'title_ar_source' => 'ummahapi.com',
            'author_ar' => 'الإمام مسلم بن الحجاج النيسابوري',
            'author_ar_source' => 'developer',
            'author_ar_status' => 'approved',
        ],
        'abudawud' => [
            'title_ar' => 'سنن أبي داود',
            'title_ar_source' => 'ummahapi.com',
            'author_ar' => 'الإمام أبو داود سليمان بن الأشعث السجستاني',
            'author_ar_source' => 'developer',
            'author_ar_status' => 'approved',
        ],
        'tirmidhi' => [
            'title_ar' => 'جامع الترمذي',
            'title_ar_source' => 'ummahapi.com',
            'author_ar' => 'الإمام أبو عيسى محمد بن عيسى الترمذي',
            'author_ar_source' => 'developer',
            'author_ar_status' => 'approved',
        ],
        'ibnmajah' => [
            'title_ar' => 'سنن ابن ماجه',
            'title_ar_source' => 'ummahapi.com',
            'author_ar' => 'الإمام محمد بن يزيد ابن ماجه القزويني',
            'author_ar_source' => 'developer',
            'author_ar_status' => 'approved',
        ],
        'nasai' => [
            'title_ar' => 'سنن النسائي',
            'title_ar_source' => 'ummahapi.com',
            'author_ar' => 'الإمام أحمد بن شعيب النسائي',
            'author_ar_source' => 'developer',
            'author_ar_status' => 'approved',
        ],
        'malik' => [
            'title_ar' => 'موطأ مالك',
            'title_ar_source' => 'ummahapi.com',
            'author_ar' => 'الإمام مالك بن أنس',
            'author_ar_source' => 'developer',
            'author_ar_status' => 'approved',
        ],
        'nawawi40' => [
            'title_ar' => 'الأربعون النووية',
            'title_ar_source' => 'ummahapi.com',
            'author_ar' => 'الإمام يحيى بن شرف النووي',
            'author_ar_source' => 'developer',
            'author_ar_status' => 'approved',
        ],
        'qudsi40' => [
            'title_ar' => 'الأحاديث القدسية',
            'title_ar_source' => 'ummahapi.com',
            'author_ar' => null,
            'author_ar_source' => null,
            'author_ar_status' => null,
        ],
        'shahwaliullah40' => [
            'title_ar' => 'الأربعون لولي الله الدهلوي',
            'title_ar_source' => 'ummahapi.com',
            'author_ar' => 'الإمام شاه ولي الله الدهلوي',
            'author_ar_source' => 'developer',
            'author_ar_status' => 'approved',
        ],
    ],

    'sections' => [],

];

<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Hadith ingestion (ADR 0042)
|--------------------------------------------------------------------------
|
| Every value here is a reviewed decision. Hadith text comes only from fawazahmed0/hadith-api, pinned to one full
| commit. Grades are stored with their graders but stay hidden. Only the dev-only API key is read from env.
*/

return [

    'source_code' => 'fawazahmed0',
    'primary_source' => 'fawazahmed0',

    // The full 40-character commit SHA. The importer fetches only this pinned revision.
    'commit' => 'df57907be35291c91ad6a6691180e22ca9920784',
    // The importer appends the pinned revision and the file path to this base, with no trailing slash.
    'cdn_base' => 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api',

    // A constant. Only a developer edit changes it; it is not read from env.
    'grades_visible' => false,

    // The ten collection slugs in their fixed order. The index plus one is the position used in the numbered fallback.
    'collections' => [
        'bukhari',
        'muslim',
        'abudawud',
        'tirmidhi',
        'ibnmajah',
        'nasai',
        'malik',
        'nawawi40',
        'qudsi40',
        'shahwaliullah40',
    ],

    // Per source: the source's collection slug mapped to the canonical slug (Sunnah.com's, checked 7 Nov 2026).
    // A slug not listed is already canonical. Edition file names keep the source's own slug.
    'slug_map' => [
        'fawazahmed0' => [
            'nawawi' => 'nawawi40',
            'qudsi' => 'qudsi40',
            'dehlawi' => 'shahwaliullah40',
        ],
    ],

    // Developer-decided exceptions to the reference.book check (ADR 0076 §5, step 6b.2). Ibn Majah: reference.book agrees for
    // 2490 and 2497 after the range correction below; these five are strays whose reference.book disagrees with both the
    // corrected ranges and OpenITI's books. Placed hadith (placements below) are exempt from this check (Q6), so they are not listed here.
    'reference_exceptions' => [
        'ibnmajah' => ['2435', '2464', '2476', '2477', '2528'],
        'tirmidhi' => ['2795', '3723'], // reference.book points to a book whose corrected range ends earlier (7 Nov 2026)
    ],

    /*
    | The pinned file map: a path relative to the repository root mapped to its lowercase hex SHA-256. null means "not
    | yet recorded". The snapshot step prints the real values, and the developer approves them. The verifier must refuse
    | a download while any value is null outside tests.
    */
    'files' => [
        'editions.json' => 'ef6eaefd10c348c500624091846d7bd7968056bea9bb15875a427d2cc2b2b3bf',
        'info.json' => 'cf1ced267ada8f606f95eb84e2b6ddfa87bfa2a6a9dd4cb2a5d9a8c1734f10fb',
        'editions/ara-bukhari.json' => 'e34a3402889ca378871da3c5984b7875c680920e93f1c8738ac7afe502179562',
        'editions/ara-muslim.json' => '194073b24090c5368e4d14a3f55c9e0ef144c7437bd7e5aa83aa4d2bc54a8ea0',
        'editions/ara-abudawud.json' => '216139c5f40a8147e700d62ffa3b5b2fe45d0e034f86941a193c598c10056189',
        'editions/ara-tirmidhi.json' => '408028cd56329ed78edbe3ad443beb96b58e16c3e5bd49f9bc7b0eac77c8820f',
        'editions/ara-ibnmajah.json' => 'b406e6be81588ab0ec1ddbed32f5fd95bbcdda242c460d88331e82eb5c2bc0aa',
        'editions/ara-nasai.json' => 'c705983c19bb089c87cd6531aff609bd94d862183ed0859115b0ff991826a956',
        'editions/ara-malik.json' => '088b1f354e110211da006d47e37dd8f8837368f318ed683271f0fdb0f09a3ab5',
        'editions/ara-nawawi.json' => '91f559b90422005b768bb449426d87d2e6fabbb43ac3a31e5c24c50ca77465e6',
        'editions/ara-qudsi.json' => '8645482e46b9ab145b3a8b740ffc7dc6902cc1cc0a1845da35b2057ec23bb55a',
        'editions/ara-dehlawi.json' => '913fa23adf0a7b62bf8a3fd80f8c8a8efc2f66ac9b7ec950443a701285193d54',
    ],

    // Dev-only (ADR 0042 §3, §4a). Null in production, and otherwise the key only when it is a non-empty string.
    // Only hadith:match-section-titles reads it, and it is never printed.
    'api_key' => env('APP_ENV') === 'production'
        ? null
        : (is_string(env('HADITH_API_KEY')) && env('HADITH_API_KEY') !== '' ? env('HADITH_API_KEY') : null),

    // Transport settings for the pinned download (step 5). Not secrets, not switches.
    'download' => [
        'timeout_seconds' => 60,
        'tries' => 3,
        'retry_delay_ms' => 1000,   // base delay; attempt n waits retry_delay_ms * 2^(n-1)
        'gap_ms' => 300,            // pause between two files in one snapshot
        'max_bytes' => 30_000_000,  // per file; ara-bukhari.json is 9.8 MB
    ],

    // Dev-only title matcher (hadith:match-section-titles, ADR 0042 §4a). Not read in production.
    'title_match' => [
        'base_url' => 'https://hadithapi.com/api',
        'timeout_seconds' => 30,
        'tries' => 5,
        'retry_delay_ms' => 1000,   // attempt n waits retry_delay_ms * 2^(n-1)
        'page_size' => 100,         // see open question 6
        'max_pages' => 2000,        // safety cap per collection
        'threshold_percent' => 95,
        // canonical slug => hadithapi.com book slug. malik and the three forty-hadith collections have no counterpart.
        'books' => [
            'bukhari' => 'sahih-bukhari',
            'muslim' => 'sahih-muslim',
            'tirmidhi' => 'al-tirmidhi',
            'abudawud' => 'abu-dawood',
            'ibnmajah' => 'ibn-e-majah',
            'nasai' => 'sunan-nasai',
        ],
        'request_gap_ms' => 1500,           // minimum time between two requests
        'max_retry_after_seconds' => 120,   // a 429 Retry-After is honoured up to this cap
    ],

    // Developer-approved section range corrections (7 Nov 2026), keyed by canonical slug and section number. The source's
    // section_details for these sections starts at 388 and 384, overlapping other books; corrected to follow the previous
    // book's last number, verified against reference.book (167/167 and 216/216 agree). Applied before books are assigned.
    'range_corrections' => [
        'muslim' => [
            '16' => ['first' => '3398', 'last' => '3567'],
            '43' => ['first' => '5938', 'last' => '6168'],
        ],
        // Ibn Majah 2490 and 2497 (gap report, 7 Nov 2026): the source's ranges overlap; corrected ranges verified against
        // reference.book, which agrees for both boundary numbers (ADR 0076 decision 9).
        'ibnmajah' => [
            '10' => ['first' => '2016', 'last' => '2089'],
            '15' => ['first' => '2390', 'last' => '2435'],
        ],
        // Tirmidhi: sections 39 and 47 run past the start of the next book (40 at 2606, 48 at 3370); corrected ranges verified
        // against reference.book (33/33 and 419/419), one outlier each listed in reference_exceptions (7 Nov 2026).
        'tirmidhi' => [
            '39' => ['first' => '2573', 'last' => '2605'],
            '47' => ['first' => '2950', 'last' => '3369'],
        ],
    ],

    // Developer-approved explicit placements of a hadith that falls in no section range (ADR 0076 decision 6). number => book_number (the source's section key).
    // Hadith outside every section range, placed by OpenITI's book (ADR 0076 decision 6, 7 Nov 2026). The text stays
    // fawazahmed0's. Placed hadith are exempt from the reference.book check (Q6). Bukhari 2711 is a weak match (score 0.463),
    // flagged in the gap report.
    'placements' => [
        'bukhari' => ['521' => '9', '2384' => '42', '2516' => '48', '2711' => '54', '3156' => '58', '4978' => '66'], // 2711: weak match, flagged in the gap report
        'muslim' => ['4968' => '33', '4969' => '33', '4970' => '33', '4971' => '33', '5885' => '41', '5886' => '41', '5114' => '36', '5115' => '36'], // 5114-5115: in sections 35 and 36, reference.book 36
        'malik' => ['958' => '20', '1090' => '27'], // outside every range; 958 by the OpenITI book boundary, 1090 (unavailable) stays in the book it follows
    ],

    // Numbers the developer accepts as complete without text, merge or fill. Empty. NOT reference_exceptions (a different check).
    'completeness_exceptions' => [],     // e.g. 'muslim' => ['123']; each entry needs a developer decision

    // A book the source lacks, inserted between two source sections (ADR 0076 decision 4, step 6b.4). Nasa'i 3857–3938 is the
    // book the fawazahmed0 edition does not have; its book_number is '35.1' (between sections 35 and 36, Q3, 7 Nov 2026).
    // The gaps file must declare exactly these books (HadithOverlayBuilder).
    'extra_books' => [
        'nasai' => [
            ['book_number' => '35.1', 'after_book' => '35', 'first' => '3857', 'last' => '3938', 'openiti_heading_ordinal' => 36],
        ],
    ],

    // Committed data files under database/data/hadith, path relative to that folder => lowercase hex SHA-256. null = not committed yet.
    // SHA-256 of every committed file under database/data/hadith (step 6b.8). The importer refuses a file whose hash differs.
    'data_files' => [
        'chapters/abudawud.json' => '4a580ddc4c25fe55f0718f4c3f772d04d6e60d888b352d356468b78579746c8b',
        'chapters/alignment/malik.json' => 'ad11c6a929007ad2c7652fa062ac08a72a8defb295cd5d3de25c652f51b8eaf3',
        'chapters/alignment/muslim.json' => '6e29b21c9fc6656e6922dae3f66c895b1983afaa102ee7f737b31b3dd012e858',
        'chapters/bukhari.json' => '3c08586986624905e59f7575bc96a53f2b1a41ee8004082d2f35b7976541a473',
        'chapters/ibnmajah.json' => '0a24157bf769f8722a6c2ea3c37d79d2904a442444089e711c6264e1efa72425',
        'chapters/malik.json' => 'bee7ba544dfc4852a93eecf87860decf58c4aa316cf6f49fba16d6730a1ca626',
        'chapters/muslim.json' => '13a0113fb282a1974f42c3701be2e81f04f01f16e28cff5b205ce2e02f14be3b',
        'chapters/nasai.json' => '00a43392bb4dc233c7a6631368a0d1e1c0bfa5ed3e6492b00ceb2d19b37b4f8b',
        'chapters/tirmidhi.json' => '01f983757f3af70cc7fa8020cec1f788f25428bcf4f4973e2a6705946bac98b6',
        'gaps/abudawud.json' => 'c9089bc137a52a5e88f4bb801ccd167a3a19d2c22ff63583d30af3f0ef4fe7a4',
        'gaps/bukhari.json' => 'e03c11eee7878b258138ca37f1d296552e7cbbcce83406cd2cd34c569f2e8179',
        'gaps/decisions/abudawud.json' => '1b5979f0e1de6bb2eef34f9983343c712e016d583fde514dc2fd9c6e27b52736',
        'gaps/decisions/bukhari.json' => '05bd06c8b8c197e6efa8824687a8d60de633cf495571de09fe613ff4b86a8119',
        'gaps/decisions/ibnmajah.json' => '6078b8e424b52cf500fcb07c3aa2ea7a23b401fe5c726ff1150c58883e69062a',
        'gaps/decisions/malik.json' => '482a97e533ac8b122680e0f610cbd302ed75aaa8e6351903e89288e2197a9c89',
        'gaps/decisions/muslim.json' => 'd016edc8c4efbcebd08c57efc6bbcd9b0d2629b1dd14b78f325b747294a84b1a',
        'gaps/decisions/nasai.json' => '0748a983ba6a4c2471efb5cea212c70dad55c80e7ef7e0d8c8bd8d7f75b60653',
        'gaps/decisions/tirmidhi.json' => '74d9c17f550528a1cf22d99576230a0ca240cb2dee286531fed9e4a9f98fb313',
        'gaps/ibnmajah.json' => '78ea59129da9cb75cf67e781833cba2ed7aae514ebb8b5ee8741fefedaa17b6e',
        'gaps/malik.json' => 'ad826b15039bdbe7e17a9be32a83638d62d30f680b165dea57246b961b7fa328',
        'gaps/muslim.json' => '8af80a2cb5ef6ab62d5360722e1c2fc609c5ef088878b938e4897ae0e92ea936',
        'gaps/nasai.json' => '42691f6308d73e6c2ebfaad9b4fb6b9d3d8e6b3e0cc5777ece0303165d63d118',
        'gaps/tirmidhi.json' => '03b8bb5deb7e4dac7b43f3e366a2840ee6e04699d0a0b7d0349571328068061c',
        'explanations/hadeethenc.json' => '17d0899328fc8037fa8e7aca4129e33df4421d559248a5b182e6f06f6d238c33',
    ],

    /*
    | Dataset gap sources (ADR 0076, gap-report extension, 7 Nov 2026): Sunnah.com-derived files whose licence is only a
    | claim or absent. Provenance only. Each origin reads the files of its collections from `dir` (relative to storage/),
    | after the SHA-256 check against `files`. Records are located by the rule in HadithGapBuilder (an anchor on the
    | fawazahmed0 previous hadith, then the slot after it); `record.list` is the key of the record array (null = the root
    | is the array), `record.text` is the field that holds the Arabic text, stored exactly as the dataset has it.
    */
    'datasets' => [
        'meeatif' => [
            'source' => 'meeAtif/hadith_datasets',
            'revision' => 'cd62605e4fef3c46968a5f9fdcccbbbffdf631b5',
            'dir' => 'app/private/sources/datasets/meeatif',
            'files' => [
                'Sahih Muslim.json' => '1484b90749b56444095a6bcec2532f001ae1a09226913484580fecf7e6fa55b8',
                'Jami` at-Tirmidhi.json' => 'b17d9accb861b9eac5f3b8494ff6ee38bffb7f90b08eb77bc2e610c5bb25d693',
            ],
            'collections' => [
                'muslim' => 'Sahih Muslim.json',
                'tirmidhi' => 'Jami` at-Tirmidhi.json',
            ],
            'record' => ['list' => null, 'text' => 'Arabic_Text'],
        ],
        'hadithjson' => [
            'source' => 'AhmedBaset/hadith-json',
            'revision' => '70b83d6d21995bb32f8d7271cd75501be5a922a7',
            'dir' => 'app/private/sources/datasets/hadithjson',
            'files' => [
                'muslim.json' => '12e3cbe8e2c83acc787b3e1e644877eff0feab11f1b32493386c60703d9076ae',
                'tirmidhi.json' => '9ba6da92af6b0db9768c67f4c562c24bbbdb7be83509a78c40994c6d93366437',
                'malik.json' => 'a926eb6395a391c2b7a571cceef8bc058a9d06960a2135f37964a18dc5348ef8',
            ],
            'collections' => [
                'muslim' => 'muslim.json',
                'tirmidhi' => 'tirmidhi.json',
                'malik' => 'malik.json',
            ],
            'record' => ['list' => 'hadiths', 'text' => 'arabic'],
        ],
    ],

    // OpenITI: used only by the dev commands (hadith:build-gaps, hadith:match-chapters). Production never reads it. The
    // SHA-256 values are the primary versions of the gap report (docs/plans/phase-7/gapfill-report.md). unit_count is the
    // golden count of the unit reader (step 6b.6). markup holds the chapter and book heading patterns for step 6b.7 (9.2).
    'openiti' => [
        // The folder of the pinned files, relative to storage/. Git-ignored (storage/app/private/.gitignore). hadith:build-gaps and
        // hadith:match-chapters read it unless --openiti-dir is given.
        'dir' => 'app/private/sources/openiti',
        'release' => '2023.1.8',
        'doi' => '10.5281/zenodo.10007820',
        'zenodo_file_id' => 'e1b4fd36-e7b8-4041-b893-3dc5db88c8de',
        'zenodo_archive_md5' => '8563c35f71bb51d4509d839f8cf069e6',
        'tirmidhi_repository' => 'OpenITI/0300AH',
        'tirmidhi_commit' => '01a1544130e0236850ef2698923ad01575c5bd7c',
        'files' => [
            'bukhari' => [
                'path' => '0256Bukhari/0256Bukhari.Sahih/0256Bukhari.Sahih.Shamela0001681-ara1',
                'sha256' => 'b19b17cb5da39e06fde6b099dc8674994ca59980f090a12ca86a55adcd163375',
                'unit_start' => '/^### \| ?([0-9]+) ?- /u', 'unit_stop' => '/^###/u', 'unit_count' => 7378,
                'markup' => ['chapter' => '/^### \| ?(?![0-9])(.+)$/u', 'book' => '/^### \$ (.+)$/u'],
            ],
            'muslim' => [
                'path' => '0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1',
                'sha256' => 'a96f38425099d55769435a4d8d240b064d7d98c2326457ed8d28fb1f098d32b4',
                'unit_start' => '/^# ([0-9]+) /u', 'unit_stop' => '/^(###|# \|)/u', 'unit_count' => 7461,
                'markup' => ['chapter' => '/^# \| (.+)$/u', 'book' => '/^# \| [^\p{Arabic}]*(كتاب|أبواب)(\s|$)/u'],
                // Other OpenITI files that decisions name (entry key openiti_path). Each pin is the SHA-256 of the file; the unit
                // patterns and counts are the measurement's (gapfill-report «Primary versions» and the x_/g_ runs, step 6b.6).
                // The builder refuses a decision that uses an alternate without a pin (openiti_alternate_unpinned).
                'alternates' => [
                    ['path' => '0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.Shamela0001727-ara1.mARkdown', 'sha256' => '511373465b8ca47d53655ef15a3a57de3c943a5d7f307c5537d1aa6c39a5a746', 'unit_start' => '/^### \$ ?([0-9]+)?/u', 'unit_stop' => '/^###/u', 'unit_count' => 6463],
                    ['path' => '0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.ShamAY0033938-ara2', 'sha256' => '5d67f6d47ab9ab08801c7b840b6f36daa138f641fa5ca78f7c6ec0ad39d67478', 'unit_start' => '/^# ([0-9]+)- ?/u', 'unit_stop' => '/^###/u', 'unit_count' => 7699],
                ],
            ],
            'nasai' => [
                'path' => '0303Nasai/0303Nasai.SunanSughra/0303Nasai.SunanSughra.Shamela0000829-ara1',
                'sha256' => '3fce1aacdaa96a20c7fd32f97d6d255196ebe21c458693f9281baf46fd7db11e',
                'unit_start' => '/^### \|\|\| ?([0-9]+) ?- ?/u', 'unit_stop' => '/^###/u', 'unit_count' => 5768,
                'markup' => ['chapter' => '/^### \|\| (.+)$/u', 'book' => '/^### \| ?[0-9]+ ?- (.+)$/u'],
            ],
            'abudawud' => [
                'path' => '0275AbuDawudSijistani/0275AbuDawudSijistani.Sunan/0275AbuDawudSijistani.Sunan.Shamela0001726-ara1',
                'sha256' => '58f8fb59122383c1dd0d7c7184f372a0076f3db9e19e9af9640881564b480472',
                'unit_start' => '/^### \| ?([0-9]+) ?- /u', 'unit_stop' => '/^###/u', 'unit_count' => 5284,
                'markup' => ['chapter' => '/^### \| ?(?![0-9])(.+)$/u', 'book' => '/^### \$ (.+)$/u'],
            ],
            'ibnmajah' => [
                'path' => '0273IbnMaja/0273IbnMaja.Sunan/0273IbnMaja.Sunan.Shamela0001198-ara1',
                'sha256' => '17c6161f01caec91d3ee3ea602d2885f6b2bb499de44d6090a76196945dd6bc9',
                'unit_start' => '/^### \| ?([0-9]+) ?- /u', 'unit_stop' => '/^###/u', 'unit_count' => 4343,
                'markup' => ['chapter' => '/^### \| ?(?![0-9])(.+)$/u', 'book' => null],
            ],
            'malik' => [
                'path' => '0179MalikIbnAnas/0179MalikIbnAnas.Muwatta/0179MalikIbnAnas.Muwatta.JK000466-ara1',
                'sha256' => 'c104e5604d96af249ad631d0c8e92e41e7fd65b53f29d5ae443cb0142637db46',
                'unit_start' => '/^# ([0-9]+) /u', 'unit_stop' => '/^(###|# \|)/u', 'unit_count' => 1822,
                'markup' => ['chapter' => '/^# \| (.+)$/u', 'book' => '/^# \| [^\p{Arabic}]*(كتاب|أبواب)(\s|$)/u'],
                // See muslim: sha256 null = not pinned yet; unit patterns not yet checked against this file.
                'alternates' => [
                    ['path' => '0179MalikIbnAnas/0179MalikIbnAnas.Muwatta/0179MalikIbnAnas.Muwatta.Shamela0001699-ara1.completed', 'sha256' => 'b2b1e115ee424d81629a0f9b6976b92f33437088a5e5fc7c39b6bbbc56f55116', 'unit_start' => '/^# ([0-9]+) - ?/u', 'unit_stop' => '/^###/u', 'unit_count' => 1832],
                ],
            ],
            'tirmidhi' => [
                'path' => 'data/0279Tirmidhi/0279Tirmidhi.Sunan/0279Tirmidhi.Sunan.JK000140-ara1.completed',
                'sha256' => '5bc99d3d942ceaa729a83c11389016d940ae11fb0b641a4e012c743f9e44b647',
                'unit_start' => '/^### \|\|\| ?([0-9]+)/u', 'unit_stop' => '/^###/u', 'unit_count' => 3976,
                'markup' => ['chapter' => '/^### \|\| (.+)$/u', 'book' => '/^### \| (.+)$/u'],
            ],
        ],
    ],

];

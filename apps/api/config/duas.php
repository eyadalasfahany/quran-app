<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Duas ingestion (ADR 0044-duas)
|--------------------------------------------------------------------------
|
| Prophetic duas use a separate HadeethEnc snapshot pin from Azkar (decision 5). Quranic spans are reviewed in
| config/duas_quran_map.php. Collection book rows stay empty until decision 18 is wired into the import.
*/

return [

    'hadeethenc' => [
        'api_base' => 'https://hadeethenc.com/api/v1',
        'site_url' => 'https://hadeethenc.com/ar/browse/hadith/',
        'language' => 'ar',
        // Decision 5: textual dua categories only (103 distinct hadiths in the pinned snapshot).
        'category_ids' => [301, 302, 303, 305, 306, 307, 308, 313],
        'per_page' => 100,
        'gap_ms' => 300,
        'retry_delay_ms' => 1000,
        // Set by `php artisan duas:snapshot hadeethenc` after the first successful run.
        'snapshot_date' => '2026-11-03',
        'snapshot_sha256' => '0db81252da43470c2557c75ed35669cf8425b997867cd72378a9b7035c42e512',
    ],

    // Decision 18: five books of supplication (slug => book number). Filled by the import from this list.
    'collection_books' => [],

];

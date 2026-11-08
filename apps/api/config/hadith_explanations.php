<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Hadith explanations (ADR 0078)
|--------------------------------------------------------------------------
|
| HadeethEnc explanations (شرح) for the hadith collections. The snapshot is pinned like config/duas.php: the manifest
| SHA-256 is recorded here after a developer-reviewed run of hadith:explanations-snapshot. Thresholds are the result of
| the mapping measurement (hadith:map-explanations, with its negative control); change them only with a new measurement.
*/

return [

    'hadeethenc' => [
        'api_base' => 'https://hadeethenc.com/api/v1',
        'site_url' => 'https://hadeethenc.com/ar/browse/hadith/',
        'language' => 'ar',
        // The seven root categories (checked 8 Nov 2026). The snapshotter adds every descendant category by parent_id.
        'category_ids' => [1, 2, 3, 4, 5, 6, 7],
        'per_page' => 100,
        'gap_ms' => 300,
        'retry_delay_ms' => 1000,
        'snapshot_date' => '2026-11-08',
        'snapshot_sha256' => '0b309bb32ca9e88c8d63ec33ad7453140addd4fbab697e5c9231936f78c8060b',
    ],

    // Mapping thresholds (ADR 0078). A link needs the best containment of the HadeethEnc matn words in a hadith of the
    // named collection at least min_containment, and at least min_gap above the second-best hadith of that collection.
    'mapping' => [
        'min_containment' => 0.8,
        'min_gap' => 0.1,
    ],

];

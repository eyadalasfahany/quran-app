<?php

declare(strict_types=1);

// Only the website's suggestion form calls the API cross-origin (ADR 0066). The app is native and needs no CORS.
return [

    'paths' => ['api/v1/suggestions'],

    'allowed_methods' => ['POST', 'OPTIONS'],

    'allowed_origins' => ['https://taybah-app.com', 'https://www.taybah-app.com'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Accept-Language', 'Content-Type'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];

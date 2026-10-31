<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // ADR 0031 §2. Dorar is used only through the API. Off unless a token is set and DORAR_ENABLED is true.
    'dorar' => [
        'enabled' => (bool) env('DORAR_ENABLED', false),
        'base_url' => env('DORAR_API_BASE_URL', ''),
        'token' => env('DORAR_API_TOKEN', ''),
        'token_header' => env('DORAR_TOKEN_HEADER', 'Authorization'),
        'token_prefix' => env('DORAR_TOKEN_PREFIX', 'Bearer '),
        'timeout_seconds' => (int) env('DORAR_TIMEOUT_SECONDS', 5),
        'max_requests_per_minute' => (int) env('DORAR_MAX_REQUESTS_PER_MINUTE', 30),
        'cache_ttl_seconds' => (int) env('DORAR_CACHE_TTL_SECONDS', 0),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];

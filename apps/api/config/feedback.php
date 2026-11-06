<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Suggestion admin address
    |--------------------------------------------------------------------------
    |
    | Every suggestion is emailed here. Set FEEDBACK_ADMIN_EMAIL in the environment, never in the repo.
    |
    */

    'admin_address' => env('FEEDBACK_ADMIN_EMAIL'),

    /*
    |--------------------------------------------------------------------------
    | Retention
    |--------------------------------------------------------------------------
    |
    | Suggestions older than this many months are pruned by the scheduled model:prune (ADR 0066).
    |
    */

    'retention_months' => 12,

    /*
    |--------------------------------------------------------------------------
    | Mail branding
    |--------------------------------------------------------------------------
    |
    | Absolute links and the logo used in the suggestion mails. Mail clients need absolute URLs, and the
    | logo is served by the website (taybah-app.com, ADR 0063), never attached.
    |
    */

    'mail' => [
        'site_url' => 'https://www.taybah-app.com',
        'logo_url' => 'https://www.taybah-app.com/assets/images/apple-touch-icon.png',
        'download_url' => 'https://www.taybah-app.com/download?src=email',
    ],

    /*
    |--------------------------------------------------------------------------
    | Abuse limits (ADR 0066 decision 5)
    |--------------------------------------------------------------------------
    |
    | per_ip_hour and per_ip_day are the public endpoint's limits. auto_replies_per_email_day caps the
    | auto-reply per email address, keyed on its SHA-256.
    |
    */

    'limits' => [
        'per_ip_hour' => 5,
        'per_ip_day' => 20,
        'auto_replies_per_email_day' => 2,
    ],

];

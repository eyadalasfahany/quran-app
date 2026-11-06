<?php

declare(strict_types=1);

use Illuminate\Mail\Transport\ResendTransport;
use Illuminate\Support\Facades\Mail;

/*
| Production mails through Resend's HTTPS API, because Railway blocks outbound SMTP below the Pro plan (ADR 0066).
| These tests check the wiring only: no request is sent.
*/

it('builds the Resend HTTPS transport from RESEND_API_KEY', function (): void {
    config(['services.resend.key' => 're_test_key']);

    $transport = Mail::mailer('resend')->getSymfonyTransport();

    expect($transport)->toBeInstanceOf(ResendTransport::class)
        ->and((string) $transport)->toBe('resend');
});

it('reads the Resend key from the RESEND_API_KEY variable', function (): void {
    $services = (string) file_get_contents(config_path('services.php'));

    expect($services)->toContain("'key' => env('RESEND_API_KEY')");
});

<?php

declare(strict_types=1);

use App\Domains\Feedback\Mail\SuggestionAutoReply;
use App\Domains\Feedback\Mail\SuggestionReceived;
use App\Domains\Feedback\Models\Suggestion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Email;

// Sends through the array transport, not the fake, so the real Blade views and localized subject are rendered.
uses(RefreshDatabase::class);

function sentArrayMessage(): Email
{
    $messages = Mail::mailer('array')->getSymfonyTransport()->messages();

    return $messages[count($messages) - 1]->getOriginalMessage();
}

it('sends the Arabic auto-reply with the localized subject and RTL direction, without the name or message', function (): void {
    Mail::mailer('array')->to('visitor@example.test')->send((new SuggestionAutoReply)->locale('ar'));

    $email = sentArrayMessage();
    $html = (string) $email->getHtmlBody();

    expect($email->getSubject())->toBe(trans('feedback.auto_reply.subject', [], 'ar'))
        ->and($html)->toContain('dir="rtl"')
        ->and($html)->not->toContain('FIXTURE name 1')
        ->and($html)->not->toContain('FIXTURE message text 1');
});

it('sends the admin mail with the message escaped, line breaks kept and the visitor as Reply-To', function (): void {
    $suggestion = Suggestion::factory()->create([
        'name' => 'FIXTURE name 1',
        'email' => 'visitor@example.test',
        'message' => "<b>x</b>\nFIXTURE line 2 — not a suggestion",
        'locale' => 'ar',
        'created_at' => now(),
    ]);

    Mail::mailer('array')->to('admin@example.test')->send(new SuggestionReceived($suggestion));

    $email = sentArrayMessage();
    $html = (string) $email->getHtmlBody();

    expect($html)->toContain('&lt;b&gt;x&lt;/b&gt;')
        ->and($html)->not->toContain('<b>x</b>')
        ->and($html)->toContain('<br')
        ->and($html)->toContain('FIXTURE line 2')
        ->and($email->getReplyTo()[0]->getAddress())->toBe('visitor@example.test');
});

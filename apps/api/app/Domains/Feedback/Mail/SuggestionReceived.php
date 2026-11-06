<?php

declare(strict_types=1);

namespace App\Domains\Feedback\Mail;

use App\Domains\Feedback\Models\Suggestion;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * The admin notification for a new suggestion. Reply-To is the visitor, so a reply goes straight to them.
 */
final class SuggestionReceived extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(public Suggestion $suggestion)
    {
        $this->afterCommit();
        $this->locale('en');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('feedback.admin_subject'),
            replyTo: [new Address($this->suggestion->email, $this->suggestion->name ?? '')],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.feedback.received');
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Feedback\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * The fixed reply to the visitor. It carries no data about the visitor: never the name or the message (ADR 0066).
 */
final class SuggestionAutoReply extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct()
    {
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('feedback.auto_reply.subject'));
    }

    public function content(): Content
    {
        return new Content(view: 'mail.feedback.auto-reply');
    }
}

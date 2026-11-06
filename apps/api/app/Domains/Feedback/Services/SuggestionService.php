<?php

declare(strict_types=1);

namespace App\Domains\Feedback\Services;

use App\Domains\Feedback\Data\SuggestionData;
use App\Domains\Feedback\Mail\SuggestionAutoReply;
use App\Domains\Feedback\Mail\SuggestionReceived;
use App\Domains\Feedback\Models\Suggestion;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

/**
 * Stores a website suggestion and sends the admin notification and the visitor's auto-reply (ADR 0066).
 * A mail failure is reported and never thrown out of submit(): the suggestion is already saved.
 */
final class SuggestionService
{
    private const int AUTO_REPLY_WINDOW_SECONDS = 86400;

    public function submit(SuggestionData $data): void
    {
        if ($data->honeypotFilled) {
            return;
        }

        $suggestion = Suggestion::query()->create([
            'name' => $data->name,
            'email' => $data->email,
            'message' => $data->message,
            'locale' => $data->locale,
            'source' => $data->source,
            'auto_reply_sent' => false,
        ]);

        $this->sendAutoReplyIfAllowed($suggestion, $data);
        $this->notifyAdmin($suggestion);
    }

    private function sendAutoReplyIfAllowed(Suggestion $suggestion, SuggestionData $data): void
    {
        $key = 'suggestion-auto-reply:'.hash('sha256', mb_strtolower($data->email));
        $limit = (int) config('feedback.limits.auto_replies_per_email_day', 2);

        $allowed = RateLimiter::attempt($key, $limit, static fn (): bool => true, self::AUTO_REPLY_WINDOW_SECONDS);

        if ($allowed !== true) {
            return;
        }

        try {
            Mail::to($data->email)->queue((new SuggestionAutoReply)->locale($data->locale));
            $suggestion->update(['auto_reply_sent' => true]);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function notifyAdmin(Suggestion $suggestion): void
    {
        $adminAddress = config('feedback.admin_address');

        if (! is_string($adminAddress) || $adminAddress === '') {
            Log::warning('Suggestion stored but FEEDBACK_ADMIN_EMAIL is not set; no admin notification sent.', [
                'suggestion_id' => $suggestion->id,
            ]);

            return;
        }

        try {
            Mail::to($adminAddress)->queue(new SuggestionReceived($suggestion));
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}

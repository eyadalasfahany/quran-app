<?php

declare(strict_types=1);

use App\Domains\Feedback\Mail\SuggestionAutoReply;
use App\Domains\Feedback\Mail\SuggestionReceived;
use App\Domains\Feedback\Models\Suggestion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

/**
 * @return array<string, string>
 */
function limitPayload(string $email = 'visitor@example.test'): array
{
    return [
        'email' => $email,
        'message' => 'FIXTURE message text 1 — not a suggestion',
        'locale' => 'en',
    ];
}

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Mail::fake();
    config(['feedback.admin_address' => 'admin@example.test']);
});

it('answers 429 on the sixth suggestion from one address within an hour', function (): void {
    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/v1/suggestions', limitPayload())->assertStatus(202);
    }

    $this->postJson('/api/v1/suggestions', limitPayload())
        ->assertStatus(429)
        ->assertHeader('Content-Type', 'application/problem+json');

    expect(Suggestion::query()->count())->toBe(5);
});

it('caps auto-replies at two per email per day but still stores and notifies every suggestion', function (): void {
    foreach (['198.51.100.1', '198.51.100.2', '198.51.100.3'] as $ip) {
        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson('/api/v1/suggestions', limitPayload('Visitor@Example.test'))
            ->assertStatus(202);
    }

    expect(Suggestion::query()->count())->toBe(3);
    expect(Suggestion::query()->where('auto_reply_sent', false)->count())->toBe(1);
    expect(Suggestion::query()->where('auto_reply_sent', true)->count())->toBe(2);

    expect(Mail::queued(SuggestionReceived::class))->toHaveCount(3);
    expect(Mail::queued(SuggestionAutoReply::class))->toHaveCount(2);
});

it('answers 202 and keeps the row when the mail transport throws', function (): void {
    Mail::shouldReceive('to')->andThrow(new RuntimeException('smtp unavailable'));

    $this->postJson('/api/v1/suggestions', limitPayload())
        ->assertStatus(202)
        ->assertExactJson(['status' => 'received']);

    expect(Suggestion::query()->count())->toBe(1);
    expect(Suggestion::query()->value('auto_reply_sent'))->toBeFalse();
});

it('stores the suggestion and skips the admin mail when no admin address is configured', function (): void {
    config(['feedback.admin_address' => null]);

    $this->postJson('/api/v1/suggestions', limitPayload())->assertStatus(202);

    expect(Suggestion::query()->count())->toBe(1);
    Mail::assertNotQueued(SuggestionReceived::class);
    expect(Mail::queued(SuggestionAutoReply::class))->toHaveCount(1);
});

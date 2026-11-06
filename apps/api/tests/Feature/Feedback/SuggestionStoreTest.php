<?php

declare(strict_types=1);

use App\Domains\Feedback\Mail\SuggestionAutoReply;
use App\Domains\Feedback\Mail\SuggestionReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

/**
 * @return array<string, string>
 */
function suggestionPayload(string $locale = 'ar', array $overrides = []): array
{
    return array_merge([
        'name' => 'FIXTURE name 1',
        'email' => 'visitor@example.test',
        'message' => 'FIXTURE message text 1 — not a suggestion',
        'locale' => $locale,
    ], $overrides);
}

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Mail::fake();
});

it('stores the suggestion and answers 202 received', function (): void {
    $this->postJson('/api/v1/suggestions', suggestionPayload())
        ->assertStatus(202)
        ->assertExactJson(['status' => 'received']);

    $this->assertDatabaseHas('suggestions', [
        'name' => 'FIXTURE name 1',
        'email' => 'visitor@example.test',
        'locale' => 'ar',
        'auto_reply_sent' => true,
    ]);
});

it('queues the admin mail with the visitor as Reply-To and the auto-reply in the visitor locale', function (string $locale): void {
    config(['feedback.admin_address' => 'admin@example.test']);

    $this->postJson('/api/v1/suggestions', suggestionPayload($locale))->assertStatus(202);

    Mail::assertQueued(SuggestionReceived::class, function (SuggestionReceived $mail): bool {
        return $mail->hasTo('admin@example.test') && $mail->hasReplyTo('visitor@example.test', 'FIXTURE name 1');
    });
    Mail::assertQueued(SuggestionAutoReply::class, function (SuggestionAutoReply $mail) use ($locale): bool {
        return $mail->hasTo('visitor@example.test') && $mail->locale === $locale;
    });
    Mail::assertQueuedCount(2);
})->with(['ar', 'en']);

it('accepts an English submission without a name', function (): void {
    config(['feedback.admin_address' => 'admin@example.test']);

    $this->postJson('/api/v1/suggestions', suggestionPayload('en', ['name' => '']))
        ->assertStatus(202);

    $this->assertDatabaseHas('suggestions', ['name' => null, 'locale' => 'en']);
    Mail::assertQueued(SuggestionAutoReply::class, fn (SuggestionAutoReply $mail): bool => $mail->locale === 'en');
});

it('renders the auto-reply without the name or the message, in the right direction', function (string $locale, string $dir): void {
    $html = (new SuggestionAutoReply)->locale($locale)->render();

    expect($html)
        ->toContain('dir="'.$dir.'"')
        ->not->toContain('FIXTURE name 1')
        ->not->toContain('FIXTURE message text 1');
})->with([
    'ar' => ['ar', 'rtl'],
    'en' => ['en', 'ltr'],
]);

it('renders the auto-reply body in Arabic when the locale is ar', function (): void {
    $html = (new SuggestionAutoReply)->locale('ar')->render();

    expect($html)->toContain('وصلنا اقتراحك')->toContain('السلام عليكم')->toContain('فريق طيبة');
});

it('records the source, defaulting to the website', function (?string $source, string $stored): void {
    $payload = $source === null ? suggestionPayload() : suggestionPayload('ar', ['source' => $source]);

    $this->postJson('/api/v1/suggestions', $payload)->assertStatus(202);

    $this->assertDatabaseHas('suggestions', ['email' => 'visitor@example.test', 'source' => $stored]);
})->with([
    'omitted' => [null, 'website'],
    'website' => ['website', 'website'],
    'app' => ['app', 'app'],
]);

it('rejects an unknown source', function (): void {
    $this->postJson('/api/v1/suggestions', suggestionPayload('ar', ['source' => 'email']))
        ->assertStatus(422)
        ->assertJsonPath('errors.source.0', fn (mixed $message): bool => is_string($message));
});

<?php

declare(strict_types=1);

use App\Domains\Feedback\Models\Suggestion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Mail::fake();
});

it('rejects a missing email with problem details', function (): void {
    $this->postJson('/api/v1/suggestions', [
        'message' => 'FIXTURE message text 1 — not a suggestion',
        'locale' => 'ar',
    ])
        ->assertUnprocessable()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonStructure(['errors' => ['email']]);

    expect(Suggestion::query()->count())->toBe(0);
});

it('rejects a malformed email', function (): void {
    $this->postJson('/api/v1/suggestions', [
        'email' => 'not-an-email',
        'message' => 'FIXTURE message text 1 — not a suggestion',
        'locale' => 'en',
    ])->assertUnprocessable()->assertJsonStructure(['errors' => ['email']]);
});

it('rejects a message shorter than 10 characters', function (): void {
    $this->postJson('/api/v1/suggestions', [
        'email' => 'visitor@example.test',
        'message' => 'short',
        'locale' => 'en',
    ])->assertUnprocessable()->assertJsonStructure(['errors' => ['message']]);
});

it('rejects a locale other than ar or en', function (): void {
    $this->postJson('/api/v1/suggestions', [
        'email' => 'visitor@example.test',
        'message' => 'FIXTURE message text 1 — not a suggestion',
        'locale' => 'fr',
    ])->assertUnprocessable()->assertJsonStructure(['errors' => ['locale']]);
});

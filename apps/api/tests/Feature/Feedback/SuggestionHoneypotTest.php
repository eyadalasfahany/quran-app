<?php

declare(strict_types=1);

use App\Domains\Feedback\Models\Suggestion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Mail::fake();
});

it('answers 202 and stores and sends nothing when the honeypot is filled', function (): void {
    $this->postJson('/api/v1/suggestions', [
        'email' => 'bot@example.test',
        'message' => 'FIXTURE message text 1 — not a suggestion',
        'locale' => 'en',
        'website' => 'https://spam.example.test',
    ])
        ->assertStatus(202)
        ->assertExactJson(['status' => 'received']);

    expect(Suggestion::query()->count())->toBe(0);
    Mail::assertNothingQueued();
});

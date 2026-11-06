<?php

declare(strict_types=1);

use App\Domains\Feedback\Models\Suggestion;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('prunes suggestions older than the retention and keeps newer ones', function (): void {
    $old = Suggestion::factory()->create(['created_at' => now()->subMonths(13)]);
    $recent = Suggestion::factory()->create(['created_at' => now()->subMonths(11)]);

    $this->artisan('model:prune', ['--model' => [Suggestion::class]])->assertSuccessful();

    expect(Suggestion::query()->whereKey($old->id)->exists())->toBeFalse();
    expect(Suggestion::query()->whereKey($recent->id)->exists())->toBeTrue();
});

<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

beforeEach(function (): void {
    Route::middleware('api')->prefix('api/v1/_test')->group(function (): void {
        Route::post('validate', fn (Request $request) => $request->validate(['email' => ['required', 'email']]));
        Route::get('missing-model', fn () => throw (new ModelNotFoundException)->setModel(User::class));
        Route::get('friendly-missing', fn () => throw new ModelNotFoundException('Bookmark not found'));
        Route::get('throttled', fn () => throw new ThrottleRequestsException('Too Many Attempts.', null, ['Retry-After' => 30]));
        Route::get('boom', fn () => throw new RuntimeException('database password leaked'));
    });
});

it('renders an unknown route as problem details in Arabic by default', function (): void {
    // Symfony's test requests send "Accept-Language: en-us" unless it is cleared.
    $response = $this->withServerVariables(['HTTP_ACCEPT_LANGUAGE' => ''])->getJson('/api/v1/does-not-exist');

    $response->assertNotFound()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJson([
            'type' => 'about:blank',
            'title' => 'غير موجود',
            'status' => 404,
            'code' => 'not_found',
        ]);
});

it('localizes the title from Accept-Language', function (string $header, string $title): void {
    $this->getJson('/api/v1/does-not-exist', ['Accept-Language' => $header])
        ->assertJsonPath('title', $title);
})->with([
    'english' => ['en-US,en;q=0.9', 'Not found'],
    'arabic region' => ['ar-EG', 'غير موجود'],
    'unsupported falls back to arabic' => ['fr-FR', 'غير موجود'],
]);

it('lists field errors for validation failures', function (): void {
    $this->postJson('/api/v1/_test/validate', ['email' => 'nope'])
        ->assertUnprocessable()
        ->assertHeader('Content-Type', 'application/problem+json')
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonStructure(['errors' => ['email']]);
});

it('keeps friendly not-found messages and drops Laravel model names', function (): void {
    $this->getJson('/api/v1/_test/friendly-missing')
        ->assertNotFound()
        ->assertJsonPath('detail', 'Bookmark not found');

    $this->getJson('/api/v1/_test/missing-model')
        ->assertNotFound()
        ->assertJsonMissingPath('detail');
});

it('passes Retry-After through on 429', function (): void {
    $this->getJson('/api/v1/_test/throttled')
        ->assertTooManyRequests()
        ->assertHeader('Retry-After', '30')
        ->assertJsonPath('code', 'too_many_requests');
});

it('hides server error details when debug is off', function (): void {
    config(['app.debug' => false]);

    $response = $this->getJson('/api/v1/_test/boom');

    $response->assertInternalServerError()
        ->assertJsonPath('code', 'server_error')
        ->assertJsonMissingPath('detail');
    expect($response->getContent())->not->toContain('database password leaked');
});

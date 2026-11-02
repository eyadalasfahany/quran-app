<?php

declare(strict_types=1);

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function (): void {
    Route::middleware('api')->prefix('api/v1/_localized')->group(function (): void {
        Route::post('validate', fn (Request $request) => $request->validate(['since_version' => ['required', 'integer', 'min:0']]));
        Route::get('not-acceptable', fn () => throw new HttpException(406));
    });
});

it('translates the title of an unknown route and drops Laravel\'s English detail', function (string $header, string $title): void {
    $response = $this->getJson('/api/v1/does-not-exist', ['Accept-Language' => $header]);

    $response->assertNotFound()
        ->assertJsonPath('code', 'not_found')
        ->assertJsonPath('title', $title);
    expect($response->json('detail'))->toBeNull();
})->with([
    'arabic' => ['ar', 'غير موجود'],
    'english' => ['en', 'Not found'],
]);

it('translates validation messages and field names', function (string $header, string $message): void {
    $response = $this->postJson('/api/v1/_localized/validate', [], ['Accept-Language' => $header]);

    $response->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed');
    expect($response->json('errors.since_version.0'))->toBe($message);
})->with([
    'arabic' => ['ar', 'حقل إصدار البداية مطلوب.'],
    'english' => ['en', 'The since version field is required.'],
]);

it('translates the title of a status that has no code of its own', function (string $header, string $title): void {
    $this->getJson('/api/v1/_localized/not-acceptable', ['Accept-Language' => $header])
        ->assertStatus(406)
        ->assertJsonPath('code', 'http_error')
        ->assertJsonPath('title', $title);
})->with([
    'arabic' => ['ar', 'نوع الاستجابة غير مقبول'],
    'english' => ['en', 'Response type not acceptable'],
]);

it('translates the detail of a missing content pack', function (string $header, string $detail): void {
    $this->getJson('/api/v1/content/packs/999999/1', ['Accept-Language' => $header])
        ->assertNotFound()
        ->assertJsonPath('code', 'not_found')
        ->assertJsonPath('detail', $detail);
})->with([
    'arabic' => ['ar', 'الحزمة غير موجودة.'],
    'english' => ['en', 'The content pack was not found.'],
]);

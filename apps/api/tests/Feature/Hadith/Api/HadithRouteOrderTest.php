<?php

declare(strict_types=1);

use App\Domains\Hadith\Http\Controllers\HadithCollectionController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

require_once __DIR__.'/Support/HadithApiFixtures.php';

uses(RefreshDatabase::class);

beforeEach(function (): void {
    Http::preventStrayRequests();
    Storage::fake('local');
    $this->withHeaders([
        'Accept' => 'application/json',
        'Accept-Language' => 'en',
    ]);
});

it('resolves /hadith/collections to the collections controller', function (): void {
    $route = Route::getRoutes()->match(Request::create('/api/v1/hadith/collections'));

    expect($route->getName())->toBe('v1.hadith.collections.index')
        ->and($route->getActionName())->toEndWith(HadithCollectionController::class.'@index');
});

it('is not shadowed by a later hadith/{id} route', function (): void {
    Route::middleware('api')->prefix('api/v1')->get('hadith/{id}', fn () => response('deferred'))->whereNumber('id');
    app('router')->getRoutes()->refreshNameLookups();
    app('router')->getRoutes()->refreshActionLookups();

    $this->getJson('/api/v1/hadith/collections')->assertOk()->assertJsonStructure(['data', 'next_cursor']);
    $this->get('/api/v1/hadith/123')->assertOk()->assertSee('deferred', false);
});

it('returns 404 for the deferred routes that do not exist', function (): void {
    $this->getJson('/api/v1/hadith/daily')->assertNotFound();
    $this->getJson('/api/v1/hadith/categories')->assertNotFound();
});

it('names the five routes', function (): void {
    expect(route('v1.hadith.collections.index', absolute: false))->toBe('/api/v1/hadith/collections')
        ->and(route('v1.hadith.books.index', ['slug' => 'bukhari'], absolute: false))->toBe('/api/v1/hadith/collections/bukhari/books')
        ->and(route('v1.hadith.chapters.index', ['slug' => 'bukhari', 'book' => '1'], absolute: false))->toBe('/api/v1/hadith/collections/bukhari/books/1/chapters')
        ->and(route('v1.hadith.entries.index', ['slug' => 'bukhari', 'book' => '1'], absolute: false))->toBe('/api/v1/hadith/collections/bukhari/books/1/hadiths')
        ->and(route('v1.hadith.entries.show', ['slug' => 'bukhari', 'number' => '2787.2'], absolute: false))->toBe('/api/v1/hadith/collections/bukhari/hadiths/2787.2');
});

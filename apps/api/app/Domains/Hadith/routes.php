<?php

declare(strict_types=1);

use App\Domains\Hadith\Http\Controllers\HadithBookController;
use App\Domains\Hadith\Http\Controllers\HadithChapterController;
use App\Domains\Hadith\Http\Controllers\HadithCollectionController;
use App\Domains\Hadith\Http\Controllers\HadithEntryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['throttle:content', 'cache.headers:public;max_age=300;etag'])->group(function (): void {
    Route::get('hadith/collections', [HadithCollectionController::class, 'index'])
        ->name('hadith.collections.index');

    Route::get('hadith/collections/{slug}/books', [HadithBookController::class, 'index'])
        ->where(['slug' => '[a-z0-9]{1,32}'])
        ->name('hadith.books.index');

    Route::get('hadith/collections/{slug}/books/{book}/chapters', [HadithChapterController::class, 'index'])
        ->where(['slug' => '[a-z0-9]{1,32}', 'book' => '[A-Za-z0-9._-]{1,16}'])
        ->name('hadith.chapters.index');

    Route::get('hadith/collections/{slug}/books/{book}/hadiths', [HadithEntryController::class, 'index'])
        ->where(['slug' => '[a-z0-9]{1,32}', 'book' => '[A-Za-z0-9._-]{1,16}'])
        ->name('hadith.entries.index');

    Route::get('hadith/collections/{slug}/hadiths/{number}', [HadithEntryController::class, 'show'])
        ->where(['slug' => '[a-z0-9]{1,32}', 'number' => '[A-Za-z0-9._-]{1,32}'])
        ->name('hadith.entries.show');
});

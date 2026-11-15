<?php

declare(strict_types=1);

use App\Domains\Seerah\Http\Controllers\SeerahBookController;
use Illuminate\Support\Facades\Route;

Route::middleware(['throttle:content', 'cache.headers:public;max_age=300;etag'])->group(function (): void {
    Route::get('seerah/books', [SeerahBookController::class, 'index'])
        ->name('seerah.books.index');
});

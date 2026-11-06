<?php

declare(strict_types=1);

use App\Domains\Feedback\Http\Controllers\SuggestionController;
use Illuminate\Support\Facades\Route;

Route::post('suggestions', SuggestionController::class)
    ->middleware('throttle:suggestions')
    ->name('suggestions.store');

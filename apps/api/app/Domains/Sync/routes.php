<?php

declare(strict_types=1);

use App\Domains\Sync\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('health', HealthController::class)
    ->middleware('no-store')
    ->name('health');

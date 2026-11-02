<?php

declare(strict_types=1);

use App\Domains\Azkar\Audio\AzkarAudioFiles;
use App\Domains\Azkar\Http\Controllers\AzkarAudioController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:azkar-audio')->group(function (): void {
    Route::get('azkar/audio/{version}/{file}', [AzkarAudioController::class, 'show'])
        ->where([
            'version' => AzkarAudioFiles::ROUTE_VERSION_REGEX,
            'file' => AzkarAudioFiles::ROUTE_NAME_REGEX,
        ])
        ->name('azkar.audio.show');
});

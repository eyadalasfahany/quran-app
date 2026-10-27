<?php

declare(strict_types=1);

use App\Domains\Content\Http\Controllers\ContentChangesController;
use App\Domains\Content\Http\Controllers\ContentManifestController;
use App\Domains\Content\Http\Controllers\ContentPackController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:content')->group(function (): void {
    Route::get('content/manifest', ContentManifestController::class)->name('content.manifest');
    Route::get('content/packs/{resource}/{version}', [ContentPackController::class, 'show'])
        ->whereNumber(['resource', 'version'])
        ->name('content.packs.show');
    Route::get('content/changes', [ContentChangesController::class, 'index'])->name('content.changes');
});

<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Storage;

it('never lets a test write to the real local disk', function (): void {
    expect(Storage::disk('local')->path(''))->not->toContain(storage_path('app/private'));
});

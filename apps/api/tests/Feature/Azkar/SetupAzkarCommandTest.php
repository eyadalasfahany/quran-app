<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Artisan;

/*
| azkar:setup chains audio sync, verify, import (--download --defer-pack), and content:ensure-packs. Early failure must
| stop before later steps run.
*/

it('is registered as azkar:setup', function (): void {
    expect(Artisan::all())->toHaveKey('azkar:setup');
});

it('stops at audio sync when --from points at a missing folder', function (): void {
    $missing = storage_path('framework/testing/azkar-setup-missing-from-'.uniqid('', true));

    $this->artisan('azkar:setup', ['--from' => $missing])
        ->expectsOutputToContain('The --from folder does not exist.')
        ->expectsOutputToContain('azkar:setup failed at azkar:audio-sync.')
        ->doesntExpectOutputToContain('azkar:setup failed at azkar:import.')
        ->assertExitCode(1);
});

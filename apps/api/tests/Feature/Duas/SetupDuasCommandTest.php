<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Artisan;

/*
| duas:setup chains snapshot (hadeethenc --pinned), import (--download --defer-pack), and content:ensure-packs. Early
| failure must stop before later steps run.
*/

it('is registered as duas:setup', function (): void {
    expect(Artisan::all())->toHaveKey('duas:setup');
});

it('stops at snapshot when the pinned snapshot date in config is invalid', function (): void {
    config([
        'duas.hadeethenc.snapshot_date' => 'not-a-date',
        'duas.hadeethenc.snapshot_sha256' => '0000000000000000000000000000000000000000000000000000000000000000',
    ]);

    $this->artisan('duas:setup')
        ->expectsOutputToContain('The date must be YYYY-MM-DD.')
        ->expectsOutputToContain('duas:setup failed at duas:snapshot.')
        ->doesntExpectOutputToContain('duas:setup failed at duas:import.')
        ->assertExitCode(1);
});

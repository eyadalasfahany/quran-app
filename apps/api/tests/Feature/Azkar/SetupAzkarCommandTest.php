<?php

declare(strict_types=1);

use Illuminate\Console\Command;
use Illuminate\Contracts\Console\Kernel as ConsoleKernelContract;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Console\Kernel as FoundationKernel;
use Illuminate\Support\Facades\Artisan;

/*
| azkar:setup chains audio sync, audio verify, the pinned hisnmuslim and hadeethenc snapshots (warn on failure),
| import (--download --defer-pack), and content:ensure-packs. Early failure of a required step must stop before later
| steps run; a failed snapshot only warns.
*/

/**
 * Stands in for one real step of azkar:setup so the chain runs without network. Records each call in order.
 */
final class FakeAzkarSetupStep extends Command
{
    /**
     * @param  ArrayObject<int, string>  $recordedCalls
     * @param  array<string, int>  $exitCodesByStep  Exit code per step label, e.g. "azkar:snapshot hisnmuslim --pinned".
     */
    public function __construct(
        string $signature,
        private readonly ArrayObject $recordedCalls,
        private readonly array $exitCodesByStep,
    ) {
        $this->signature = $signature;

        parent::__construct();
    }

    public function handle(): int
    {
        $label = $this->getName();

        if ($this->getDefinition()->hasArgument('source')) {
            $label .= ' '.$this->argument('source');
        }

        if ($this->getDefinition()->hasOption('pinned') && $this->option('pinned') === true) {
            $label .= ' --pinned';
        }

        $this->recordedCalls->append($label);

        return $this->exitCodesByStep[$label] ?? Command::SUCCESS;
    }
}

/**
 * Replaces every real step of azkar:setup with a recording fake. Returns the recorder, which lists the steps in the
 * order they ran.
 *
 * @param  array<string, int>  $exitCodesByStep
 * @return ArrayObject<int, string>
 */
function fakeAzkarSetupSteps(Application $app, array $exitCodesByStep = []): ArrayObject
{
    $recordedCalls = new ArrayObject;
    $kernel = $app->make(ConsoleKernelContract::class);
    assert($kernel instanceof FoundationKernel);

    $kernel->registerCommand(new FakeAzkarSetupStep('azkar:audio-sync {--from=}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeAzkarSetupStep('azkar:audio-verify {--full}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeAzkarSetupStep('azkar:snapshot {source} {--pinned}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeAzkarSetupStep('azkar:import {--download} {--defer-pack}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeAzkarSetupStep('content:ensure-packs', $recordedCalls, $exitCodesByStep));

    return $recordedCalls;
}

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

it('runs the hisnmuslim and hadeethenc pinned snapshots after audio and before the import, in that order', function (): void {
    $calls = fakeAzkarSetupSteps($this->app);

    $this->artisan('azkar:setup')
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe([
        'azkar:audio-sync',
        'azkar:audio-verify',
        'azkar:snapshot hisnmuslim --pinned',
        'azkar:snapshot hadeethenc --pinned',
        'azkar:import',
        'content:ensure-packs',
    ]);
});

it('warns and keeps going when a pinned snapshot is not fetched or does not match its pin', function (): void {
    $calls = fakeAzkarSetupSteps($this->app, ['azkar:snapshot hisnmuslim --pinned' => Command::FAILURE]);

    $this->artisan('azkar:setup')
        ->expectsOutputToContain('azkar:setup: hisnmuslim snapshot not fetched or not matching its pin; the import runs without it.')
        ->expectsOutputToContain('Azkar setup finished')
        ->doesntExpectOutputToContain('azkar:setup failed at')
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe([
        'azkar:audio-sync',
        'azkar:audio-verify',
        'azkar:snapshot hisnmuslim --pinned',
        'azkar:snapshot hadeethenc --pinned',
        'azkar:import',
        'content:ensure-packs',
    ]);
});

it('stops before content:ensure-packs when the import fails', function (): void {
    $calls = fakeAzkarSetupSteps($this->app, ['azkar:import' => Command::FAILURE]);

    $this->artisan('azkar:setup')
        ->expectsOutputToContain('azkar:setup failed at azkar:import.')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->not->toContain('content:ensure-packs');
});

it('skips audio sync and audio verify with --skip-audio but still runs the snapshots and the import', function (): void {
    $calls = fakeAzkarSetupSteps($this->app);

    $this->artisan('azkar:setup', ['--skip-audio' => true])
        ->expectsOutputToContain('audio skipped')
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe([
        'azkar:snapshot hisnmuslim --pinned',
        'azkar:snapshot hadeethenc --pinned',
        'azkar:import',
        'content:ensure-packs',
    ]);
});

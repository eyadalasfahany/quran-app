<?php

declare(strict_types=1);

use Illuminate\Console\Command;
use Illuminate\Contracts\Console\Kernel as ConsoleKernelContract;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Console\Kernel as FoundationKernel;
use Illuminate\Support\Facades\Artisan;

/*
| recitations:setup runs mp3quran:import, then way2quran:import only when the manifest file exists, then
| recitation-timings:import, then content:ensure-packs. Every import runs with --defer-pack. A failing step stops the chain.
*/

/**
 * Stands in for one real step of recitations:setup so the chain runs without network. Records each call in order.
 */
final class FakeRecitationsSetupStep extends Command
{
    /**
     * @param  ArrayObject<int, string>  $recordedCalls
     * @param  array<string, int>  $exitCodesByStep  Exit code per step label, e.g. "way2quran:import --defer-pack".
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

        foreach ($this->getDefinition()->getOptions() as $name => $option) {
            if ($this->option($name) === true) {
                $label .= ' --'.$name;
            }
        }

        $this->recordedCalls->append($label);

        return $this->exitCodesByStep[$label] ?? Command::SUCCESS;
    }
}

/**
 * Replaces every real step of recitations:setup with a recording fake. Returns the recorder.
 *
 * @param  array<string, int>  $exitCodesByStep
 * @return ArrayObject<int, string>
 */
function fakeRecitationsSetupSteps(Application $app, array $exitCodesByStep = []): ArrayObject
{
    $recordedCalls = new ArrayObject;
    $kernel = $app->make(ConsoleKernelContract::class);
    assert($kernel instanceof FoundationKernel);

    $kernel->registerCommand(new FakeRecitationsSetupStep('mp3quran:import {--defer-pack}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeRecitationsSetupStep('way2quran:import {--defer-pack}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeRecitationsSetupStep('recitation-timings:import {--defer-pack}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeRecitationsSetupStep('content:ensure-packs', $recordedCalls, $exitCodesByStep));

    return $recordedCalls;
}

it('is registered as recitations:setup', function (): void {
    expect(Artisan::all())->toHaveKey('recitations:setup');
});

it('runs the imports with --defer-pack in order, then content:ensure-packs, when the Way2Quran manifest exists', function (): void {
    $manifest = tempnam(sys_get_temp_dir(), 'way2quran-manifest-');
    config(['quran.way2quran_manifest_path' => $manifest]);

    $calls = fakeRecitationsSetupSteps($this->app);

    $this->artisan('recitations:setup')
        ->assertExitCode(0);

    @unlink($manifest);

    expect($calls->getArrayCopy())->toBe([
        'mp3quran:import --defer-pack',
        'way2quran:import --defer-pack',
        'recitation-timings:import --defer-pack',
        'content:ensure-packs',
    ]);
});

it('skips Way2Quran with a message when the manifest file is missing', function (): void {
    config(['quran.way2quran_manifest_path' => '/nonexistent/way2quran/manifest.json']);

    $calls = fakeRecitationsSetupSteps($this->app);

    $this->artisan('recitations:setup')
        ->expectsOutputToContain('recitations:setup: no Way2Quran manifest yet; skipped.')
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe([
        'mp3quran:import --defer-pack',
        'recitation-timings:import --defer-pack',
        'content:ensure-packs',
    ]);
});

it('stops at the first failing step and does not run the later ones', function (): void {
    config(['quran.way2quran_manifest_path' => '/nonexistent/way2quran/manifest.json']);

    $calls = fakeRecitationsSetupSteps($this->app, ['mp3quran:import --defer-pack' => Command::FAILURE]);

    $this->artisan('recitations:setup')
        ->expectsOutputToContain('recitations:setup failed at mp3quran:import.')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->toBe(['mp3quran:import --defer-pack']);
});

it('stops before content:ensure-packs when recitation-timings:import fails', function (): void {
    config(['quran.way2quran_manifest_path' => '/nonexistent/way2quran/manifest.json']);

    $calls = fakeRecitationsSetupSteps($this->app, ['recitation-timings:import --defer-pack' => Command::FAILURE]);

    $this->artisan('recitations:setup')
        ->expectsOutputToContain('recitations:setup failed at recitation-timings:import.')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->not->toContain('content:ensure-packs');
});

it('stops before recitation-timings:import when way2quran:import fails', function (): void {
    $manifest = tempnam(sys_get_temp_dir(), 'way2quran-manifest-');
    config(['quran.way2quran_manifest_path' => $manifest]);

    $calls = fakeRecitationsSetupSteps($this->app, ['way2quran:import --defer-pack' => Command::FAILURE]);

    $this->artisan('recitations:setup')
        ->expectsOutputToContain('recitations:setup failed at way2quran:import.')
        ->assertExitCode(1);

    @unlink($manifest);

    expect($calls->getArrayCopy())->toBe([
        'mp3quran:import --defer-pack',
        'way2quran:import --defer-pack',
    ]);
});

<?php

declare(strict_types=1);

use Illuminate\Console\Command;
use Illuminate\Contracts\Console\Kernel as ConsoleKernelContract;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Console\Kernel as FoundationKernel;
use Illuminate\Support\Facades\Artisan;

/*
| hadith:setup runs hadith:import --download --defer-pack, then (unless --skip-explanations) the pinned explanations
| snapshot and hadith:import-explanations, then content:ensure-packs. A failing step stops the chain.
*/

/**
 * Stands in for one real step of hadith:setup so the chain runs without network. Records each call in order.
 */
final class FakeHadithSetupStep extends Command
{
    /**
     * @param  ArrayObject<int, string>  $recordedCalls
     * @param  array<string, int>  $exitCodesByStep  Exit code per step label, e.g. "hadith:import --download --defer-pack".
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

        foreach (array_keys($this->getDefinition()->getOptions()) as $name) {
            if ($this->option($name) === true) {
                $label .= ' --'.$name;
            }
        }

        $this->recordedCalls->append($label);

        return $this->exitCodesByStep[$label] ?? Command::SUCCESS;
    }
}

/**
 * Replaces every real step of hadith:setup with a recording fake. Returns the recorder.
 *
 * @param  array<string, int>  $exitCodesByStep
 * @return ArrayObject<int, string>
 */
function fakeHadithSetupSteps(Application $app, array $exitCodesByStep = []): ArrayObject
{
    $recordedCalls = new ArrayObject;
    $kernel = $app->make(ConsoleKernelContract::class);
    assert($kernel instanceof FoundationKernel);

    $kernel->registerCommand(new FakeHadithSetupStep('hadith:import {--download} {--defer-pack}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeHadithSetupStep('hadith:explanations-snapshot {--pinned}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeHadithSetupStep('hadith:import-explanations', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeHadithSetupStep('content:ensure-packs', $recordedCalls, $exitCodesByStep));

    return $recordedCalls;
}

it('is registered as hadith:setup', function (): void {
    expect(Artisan::all())->toHaveKey('hadith:setup');
});

it('runs the import, the pinned explanations snapshot, the explanations import and content:ensure-packs, in that order', function (): void {
    $calls = fakeHadithSetupSteps($this->app);

    $this->artisan('hadith:setup')
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe([
        'hadith:import --download --defer-pack',
        'hadith:explanations-snapshot --pinned',
        'hadith:import-explanations',
        'content:ensure-packs',
    ]);
});

it('skips the explanations steps with --skip-explanations but still imports and ensures packs', function (): void {
    $calls = fakeHadithSetupSteps($this->app);

    $this->artisan('hadith:setup', ['--skip-explanations' => true])
        ->expectsOutputToContain('explanations skipped')
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe([
        'hadith:import --download --defer-pack',
        'content:ensure-packs',
    ]);
});

it('stops before the explanations and content:ensure-packs when the import fails', function (): void {
    $calls = fakeHadithSetupSteps($this->app, ['hadith:import --download --defer-pack' => Command::FAILURE]);

    $this->artisan('hadith:setup')
        ->expectsOutputToContain('hadith:setup failed at hadith:import.')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->toBe(['hadith:import --download --defer-pack']);
});

it('stops before hadith:import-explanations when the explanations snapshot fails', function (): void {
    $calls = fakeHadithSetupSteps($this->app, ['hadith:explanations-snapshot --pinned' => Command::FAILURE]);

    $this->artisan('hadith:setup')
        ->expectsOutputToContain('hadith:setup failed at hadith:explanations-snapshot.')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->not->toContain('hadith:import-explanations')
        ->and($calls->getArrayCopy())->not->toContain('content:ensure-packs');
});

<?php

declare(strict_types=1);

use Illuminate\Console\Command;
use Illuminate\Contracts\Console\Kernel as ConsoleKernelContract;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Console\Kernel as FoundationKernel;
use Illuminate\Support\Facades\Artisan;

/*
| mushaf:setup runs mushaf:import per edition, mushaf:build-word-boxes for hafs (only when hafs is selected),
| mushaf:publish per edition, then content:ensure-packs. An unknown --key fails before any step. A failing step stops.
*/

/**
 * Stands in for one real step of mushaf:setup so the chain runs without network. Records each call in order.
 */
final class FakeMushafSetupStep extends Command
{
    /**
     * @param  ArrayObject<int, string>  $recordedCalls
     * @param  array<string, int>  $exitCodesByStep  Exit code per step label, e.g. "mushaf:import warsh".
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

        foreach ($this->getDefinition()->getArguments() as $name => $argument) {
            $value = $this->argument($name);

            if ($name !== 'command' && is_string($value)) {
                $label .= ' '.$value;
            }
        }

        $this->recordedCalls->append($label);

        return $this->exitCodesByStep[$label] ?? Command::SUCCESS;
    }
}

/**
 * Replaces every real step of mushaf:setup with a recording fake. Returns the recorder.
 *
 * @param  array<string, int>  $exitCodesByStep
 * @return ArrayObject<int, string>
 */
function fakeMushafSetupSteps(Application $app, array $exitCodesByStep = []): ArrayObject
{
    $recordedCalls = new ArrayObject;
    $kernel = $app->make(ConsoleKernelContract::class);
    assert($kernel instanceof FoundationKernel);

    $kernel->registerCommand(new FakeMushafSetupStep('mushaf:import {key}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeMushafSetupStep('mushaf:build-word-boxes {key=hafs}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeMushafSetupStep('mushaf:publish {key}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeMushafSetupStep('content:ensure-packs', $recordedCalls, $exitCodesByStep));

    return $recordedCalls;
}

/**
 * @return list<string>
 */
function mushafSetupConfiguredKeys(): array
{
    return array_map(strval(...), array_keys(config('mushaf.editions')));
}

it('is registered as mushaf:setup', function (): void {
    expect(Artisan::all())->toHaveKey('mushaf:setup');
});

it('imports every edition, builds hafs word boxes, publishes every edition, then ensures packs, in config order', function (): void {
    $keys = mushafSetupConfiguredKeys();
    $calls = fakeMushafSetupSteps($this->app);

    expect($keys)->toContain('hafs');

    $this->artisan('mushaf:setup')
        ->assertExitCode(0);

    $expected = [];

    foreach ($keys as $key) {
        $expected[] = 'mushaf:import '.$key;
    }

    $expected[] = 'mushaf:build-word-boxes hafs';

    foreach ($keys as $key) {
        $expected[] = 'mushaf:publish '.$key;
    }

    $expected[] = 'content:ensure-packs';

    expect($calls->getArrayCopy())->toBe($expected);
});

it('sets up only the --key editions, in config order, and builds word boxes when hafs is among them', function (): void {
    $calls = fakeMushafSetupSteps($this->app);

    $this->artisan('mushaf:setup', ['--key' => ['warsh', 'hafs']])
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe([
        'mushaf:import hafs',
        'mushaf:import warsh',
        'mushaf:build-word-boxes hafs',
        'mushaf:publish hafs',
        'mushaf:publish warsh',
        'content:ensure-packs',
    ]);
});

it('does not build word boxes when hafs is not selected', function (): void {
    $calls = fakeMushafSetupSteps($this->app);

    $this->artisan('mushaf:setup', ['--key' => ['warsh']])
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe([
        'mushaf:import warsh',
        'mushaf:publish warsh',
        'content:ensure-packs',
    ]);
});

it('rejects an unknown --key before any step runs', function (): void {
    $calls = fakeMushafSetupSteps($this->app);

    $this->artisan('mushaf:setup', ['--key' => ['hafs', 'nope']])
        ->expectsOutputToContain('Unknown edition: nope')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->toBe([]);
});

it('stops at a failing import and does not build, publish or ensure packs', function (): void {
    $calls = fakeMushafSetupSteps($this->app, ['mushaf:import hafs' => Command::FAILURE]);

    $this->artisan('mushaf:setup')
        ->expectsOutputToContain('mushaf:setup failed at mushaf:import.')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->toBe(['mushaf:import hafs']);
});

it('stops before publishing when the word box build fails', function (): void {
    $calls = fakeMushafSetupSteps($this->app, ['mushaf:build-word-boxes hafs' => Command::FAILURE]);

    $this->artisan('mushaf:setup', ['--key' => ['hafs']])
        ->expectsOutputToContain('mushaf:setup failed at mushaf:build-word-boxes.')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->toBe([
        'mushaf:import hafs',
        'mushaf:build-word-boxes hafs',
    ]);
});

<?php

declare(strict_types=1);

use Illuminate\Console\Command;
use Illuminate\Contracts\Console\Kernel as ConsoleKernelContract;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Console\Kernel as FoundationKernel;
use Illuminate\Support\Facades\Artisan;

/*
| quran:setup runs qf:ping, then content:sync for each configured group (config order, or only the --group values),
| then content:ensure-packs. An unknown --group fails before any step. A failing step stops the chain.
*/

/**
 * Stands in for one real step of quran:setup so the chain runs without network. Records each call in order.
 */
final class FakeQuranSetupStep extends Command
{
    /**
     * @param  ArrayObject<int, string>  $recordedCalls
     * @param  array<string, int>  $exitCodesByStep  Exit code per step label, e.g. "content:sync tafsirs".
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
 * Replaces every real step of quran:setup with a recording fake. Returns the recorder.
 *
 * @param  array<string, int>  $exitCodesByStep
 * @return ArrayObject<int, string>
 */
function fakeQuranSetupSteps(Application $app, array $exitCodesByStep = []): ArrayObject
{
    $recordedCalls = new ArrayObject;
    $kernel = $app->make(ConsoleKernelContract::class);
    assert($kernel instanceof FoundationKernel);

    $kernel->registerCommand(new FakeQuranSetupStep('qf:ping', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeQuranSetupStep('content:sync {group} {--resources=}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeQuranSetupStep('content:ensure-packs', $recordedCalls, $exitCodesByStep));

    return $recordedCalls;
}

/**
 * @return list<string>
 */
function quranSetupConfiguredGroups(): array
{
    return array_map(strval(...), array_keys(config('quran.sync.groups')));
}

it('is registered as quran:setup', function (): void {
    expect(Artisan::all())->toHaveKey('quran:setup');
});

it('runs qf:ping, every configured group in config order, then content:ensure-packs', function (): void {
    $calls = fakeQuranSetupSteps($this->app);
    $groups = quranSetupConfiguredGroups();

    expect($groups)->not->toBeEmpty();

    $this->artisan('quran:setup')
        ->assertExitCode(0);

    $expected = ['qf:ping'];

    foreach ($groups as $group) {
        $expected[] = 'content:sync '.$group;
    }

    $expected[] = 'content:ensure-packs';

    expect($calls->getArrayCopy())->toBe($expected);
});

it('syncs only the --group values, still in config order', function (): void {
    $calls = fakeQuranSetupSteps($this->app);

    $this->artisan('quran:setup', ['--group' => ['mushafs', 'tafsirs']])
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe([
        'qf:ping',
        'content:sync tafsirs',
        'content:sync mushafs',
        'content:ensure-packs',
    ]);
});

it('rejects an unknown --group before any step runs', function (): void {
    $calls = fakeQuranSetupSteps($this->app);

    $this->artisan('quran:setup', ['--group' => ['tafsirs', 'nope']])
        ->expectsOutputToContain('Unknown group: nope')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->toBe([]);
});

it('stops at the first failing content:sync and does not run the later groups or content:ensure-packs', function (): void {
    $calls = fakeQuranSetupSteps($this->app, ['content:sync tafsirs' => Command::FAILURE]);

    $this->artisan('quran:setup')
        ->expectsOutputToContain('quran:setup failed at content:sync.')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->toBe([
        'qf:ping',
        'content:sync tafsirs',
    ]);
});

it('stops straight away when qf:ping fails', function (): void {
    $calls = fakeQuranSetupSteps($this->app, ['qf:ping' => Command::FAILURE]);

    $this->artisan('quran:setup')
        ->expectsOutputToContain('quran:setup failed at qf:ping.')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->toBe(['qf:ping']);
});

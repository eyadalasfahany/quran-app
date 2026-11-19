<?php

declare(strict_types=1);

use Illuminate\Console\Command;
use Illuminate\Contracts\Console\Kernel as ConsoleKernelContract;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Console\Kernel as FoundationKernel;
use Illuminate\Support\Facades\Artisan;

/*
| content:setup runs each feature's setup command in order (quran, recitations, azkar, duas, hadith, mushaf). A failing
| feature is recorded and the run continues. --skip and unknown --skip values are checked first.
*/

/**
 * Stands in for one feature's setup command so the run needs no network. Records each call in order.
 */
final class FakeContentSetupFeature extends Command
{
    /**
     * @param  ArrayObject<int, string>  $recordedCalls
     * @param  array<string, int>  $exitCodesByStep  Exit code per feature label, e.g. "azkar:setup".
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
 * Replaces the six feature setup commands with recording fakes. Returns the recorder.
 *
 * @param  array<string, int>  $exitCodesByStep
 * @return ArrayObject<int, string>
 */
function fakeContentSetupFeatures(Application $app, array $exitCodesByStep = []): ArrayObject
{
    $recordedCalls = new ArrayObject;
    $kernel = $app->make(ConsoleKernelContract::class);
    assert($kernel instanceof FoundationKernel);

    $kernel->registerCommand(new FakeContentSetupFeature('quran:setup', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeContentSetupFeature('recitations:setup', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeContentSetupFeature('azkar:setup', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeContentSetupFeature('duas:setup', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeContentSetupFeature('hadith:setup {--skip-explanations}', $recordedCalls, $exitCodesByStep));
    $kernel->registerCommand(new FakeContentSetupFeature('mushaf:setup', $recordedCalls, $exitCodesByStep));

    return $recordedCalls;
}

const CONTENT_SETUP_ALL_FEATURE_CALLS = [
    'quran:setup',
    'recitations:setup',
    'azkar:setup',
    'duas:setup',
    'hadith:setup',
    'mushaf:setup',
];

it('is registered as content:setup', function (): void {
    expect(Artisan::all())->toHaveKey('content:setup');
});

it('runs every feature setup in order and prints an ok summary', function (): void {
    $calls = fakeContentSetupFeatures($this->app);

    $this->artisan('content:setup')
        ->expectsOutputToContain('quran: ok')
        ->expectsOutputToContain('mushaf: ok')
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe(CONTENT_SETUP_ALL_FEATURE_CALLS);
});

it('continues past a failing feature, prints the failure and the summary, and exits 1', function (): void {
    $calls = fakeContentSetupFeatures($this->app, ['azkar:setup' => Command::FAILURE]);

    $this->artisan('content:setup')
        ->expectsOutputToContain('content:setup: azkar failed; continuing.')
        ->expectsOutputToContain('quran: ok')
        ->expectsOutputToContain('azkar: failed')
        ->expectsOutputToContain('duas: ok')
        ->expectsOutputToContain('mushaf: ok')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->toBe(CONTENT_SETUP_ALL_FEATURE_CALLS);
});

it('skips the features named in --skip and reports them as skipped', function (): void {
    $calls = fakeContentSetupFeatures($this->app);

    $this->artisan('content:setup', ['--skip' => ['azkar', 'duas']])
        ->expectsOutputToContain('azkar: skipped')
        ->expectsOutputToContain('duas: skipped')
        ->expectsOutputToContain('quran: ok')
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe([
        'quran:setup',
        'recitations:setup',
        'hadith:setup',
        'mushaf:setup',
    ]);
});

it('rejects an unknown --skip value before running anything', function (): void {
    $calls = fakeContentSetupFeatures($this->app);

    $this->artisan('content:setup', ['--skip' => ['quran', 'nope']])
        ->expectsOutputToContain('Unknown feature: nope')
        ->assertExitCode(1);

    expect($calls->getArrayCopy())->toBe([]);
});

it('passes --skip-explanations to hadith:setup only', function (): void {
    $calls = fakeContentSetupFeatures($this->app);

    $this->artisan('content:setup', ['--skip-explanations' => true])
        ->assertExitCode(0);

    expect($calls->getArrayCopy())->toBe([
        'quran:setup',
        'recitations:setup',
        'azkar:setup',
        'duas:setup',
        'hadith:setup --skip-explanations',
        'mushaf:setup',
    ]);
});

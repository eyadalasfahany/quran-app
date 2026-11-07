<?php

declare(strict_types=1);

use Illuminate\Support\Facades\File;

// Layering for step 6 (ADR 0042 §4a, integrations.md). Records are plain PHP; hadithapi.com is reached only by the matcher.

arch('hadith import records are plain PHP')
    ->expect('App\Domains\Hadith\Import\Records')
    ->not->toUse(['Illuminate\Database', 'Spatie\LaravelData', 'Illuminate\Http']);

arch('the hadithapi.com client imports no domain')
    ->expect('App\Integrations\HadithApiCom')
    ->not->toUse('App\Domains');

arch('only the title matcher uses hadithapi.com')
    ->expect('App\Integrations\HadithApiCom')
    ->toOnlyBeUsedIn([
        'App\Domains\Hadith\Services\HadithSectionTitleProposer',
        'App\Domains\Hadith\Console\MatchSectionTitlesCommand',
        'App\Integrations\HadithApiCom',
    ]);

arch('the importer never reads the dev-only key or the title source')
    ->expect('App\Domains\Hadith\Services\HadithImporter')
    ->not->toUse('App\Integrations\HadithApiCom');

it('reads the dev-only key only in the config and the hadithapi.com config', function (): void {
    $allowed = [
        realpath(app_path('Integrations/HadithApiCom/HadithApiComConfig.php')),
    ];

    foreach (File::allFiles(app_path()) as $file) {
        if (str_contains(File::get($file->getPathname()), 'hadith.api_key')) {
            expect($allowed)->toContain(realpath($file->getPathname()));
        }
    }
});

arch('the hadith import layers hold')
    ->expect('App\Domains\Hadith\Repositories')
    ->not->toUse(['Illuminate\Support\Facades\DB', 'Illuminate\Http']);

arch('hadith services never touch HTTP')
    ->expect('App\Domains\Hadith\Services')
    ->not->toUse(['Illuminate\Http', 'Symfony\Component\HttpFoundation']);

arch('hadith import and the hadithapi.com client use strict types')
    ->expect(['App\Domains\Hadith', 'App\Integrations\HadithApiCom'])
    ->toUseStrictTypes();

it('writes nothing under config/, database/ or app/ from the matcher', function (): void {
    $files = [
        app_path('Domains/Hadith/Services/HadithSectionTitleProposer.php'),
        app_path('Domains/Hadith/Services/HadithSectionTitleMatcher.php'),
        app_path('Domains/Hadith/Console/MatchSectionTitlesCommand.php'),
    ];

    foreach ($files as $file) {
        $source = File::get($file);

        expect($source)->not->toContain('config_path(')
            ->and($source)->not->toContain("base_path('config")
            ->and($source)->not->toContain('database_path(')
            ->and($source)->not->toContain('app_path(');
    }
});

arch('overlay value objects are plain PHP')
    ->expect('App\Domains\Hadith\Overlay')
    ->not->toUse(['Illuminate\Database', 'Spatie\LaravelData', 'Illuminate\Http']);

it('reads database_path only in HadithDataFiles within the Hadith domain', function (): void {
    foreach (File::allFiles(app_path('Domains/Hadith')) as $file) {
        $path = str_replace('\\', '/', $file->getPathname());

        if (str_contains(File::get($file->getPathname()), 'database_path(')) {
            expect($path)->toEndWith('Domains/Hadith/Overlay/HadithDataFiles.php');
        }
    }
});

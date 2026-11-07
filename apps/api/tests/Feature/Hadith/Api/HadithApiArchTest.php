<?php

declare(strict_types=1);

use App\Domains\Hadith\Repositories\Contracts\HadithCatalogueRepository;
use App\Domains\Hadith\Services\HadithCatalogueService;
use Illuminate\Http\Resources\Json\JsonResource;
use Spatie\LaravelData\Data;

arch('hadith catalogue controllers use no database, no hadith models and no DB facade')
    ->expect('App\Domains\Hadith\Http\Controllers')
    ->not->toUse(['Illuminate\Database', 'App\Domains\Hadith\Models', 'Illuminate\Support\Facades\DB']);

arch('the hadith catalogue service uses no HTTP types')
    ->expect(HadithCatalogueService::class)
    ->not->toUse(['Illuminate\Http', 'Symfony\Component\HttpFoundation']);

arch('the hadith catalogue repository is an interface and the Eloquent implementation uses no DB facade or HTTP')
    ->expect(HadithCatalogueRepository::class)
    ->toBeInterfaces();

arch('the Eloquent hadith catalogue repository uses no DB facade or HTTP')
    ->expect('App\Domains\Hadith\Repositories\Eloquent\EloquentHadithCatalogueRepository')
    ->not->toUse(['Illuminate\Support\Facades\DB', 'Illuminate\Http']);

arch('hadith API resources extend JsonResource')
    ->expect('App\Domains\Hadith\Http\Resources')
    ->toExtend(JsonResource::class);

arch('hadith data objects extend the Data base class and use no HTTP')
    ->expect('App\Domains\Hadith\Data')
    ->toExtend(Data::class)
    ->not->toUse(['Illuminate\Http']);

arch('the hadith read side never imports the import, source or integration code')
    ->expect(['App\Domains\Hadith\Http', 'App\Domains\Hadith\Services\HadithCatalogueService', 'App\Domains\Hadith\Repositories\Eloquent\EloquentHadithCatalogueRepository'])
    ->not->toUse(['App\Domains\Hadith\Import', 'App\Domains\Hadith\Sources', 'App\Integrations']);

it('keeps search text, English text and narrator columns out of the resources and the repository', function (): void {
    $files = [
        ...glob(app_path('Domains/Hadith/Http/Resources/*.php')),
        app_path('Domains/Hadith/Repositories/Eloquent/EloquentHadithCatalogueRepository.php'),
        app_path('Domains/Hadith/Services/HadithCatalogueService.php'),
    ];

    foreach ($files as $file) {
        $contents = (string) file_get_contents($file);

        expect($contents)->not->toContain('text_search')
            ->and($contents)->not->toContain('text_en')
            ->and($contents)->not->toContain('narrator_en')
            ->and($contents)->not->toContain('HadithSearchTextNormalizer');
    }
});

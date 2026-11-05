<?php

declare(strict_types=1);

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Resources\Json\JsonResource;
use Spatie\LaravelData\Data;

// Layering rules from spec section 3 and ADR 0002.

arch()->preset()->php();

arch()->preset()->security();

arch('every file declares strict types')
    ->expect('App')
    ->toUseStrictTypes();

arch('controllers never touch Eloquent or repositories')
    ->expect('App\Domains\*\Http\Controllers')
    ->not->toUse(['Illuminate\Database', 'App\Models', 'Illuminate\Support\Facades\DB']);

arch('services never touch HTTP')
    ->expect('App\Domains\*\Services')
    ->not->toUse(['Illuminate\Http', 'Symfony\Component\HttpFoundation', 'Illuminate\Support\Facades\Request']);

arch('repositories never touch HTTP or open transactions')
    ->expect('App\Domains\*\Repositories')
    ->not->toUse(['Illuminate\Http', 'Symfony\Component\HttpFoundation', 'Illuminate\Support\Facades\DB']);

arch('repository contracts are interfaces')
    ->expect('App\Domains\*\Repositories\Contracts')
    ->toBeInterfaces();

arch('data objects extend laravel-data')
    ->expect('App\Domains\*\Data')
    ->toExtend(Data::class);

// ADR 0006: Data objects carry values between layers; API Resources shape responses, so Scramble can read them.
arch('data objects never shape HTTP responses')
    ->expect('App\Domains\*\Data')
    ->not->toUse(['Illuminate\Http', 'Symfony\Component\HttpFoundation']);

arch('responses are API resources')
    ->expect('App\Domains\*\Http\Resources')
    ->toExtend(JsonResource::class);

arch('integrations never import domains')
    ->expect('App\Integrations')
    ->not->toUse('App\Domains');

// ADR 0031 §2: Dorar data never reaches content tables, packs or the Azkar services/models.
// Only the Azkar Sources namespace and AzkarServiceProvider (which picks the source) may use Integrations\Dorar.
arch('dorar never reaches azkar services, packs, models or contracts')
    ->expect([
        'App\Domains\Azkar\Services',
        'App\Domains\Azkar\Models',
        'App\Domains\Azkar\Contracts',
        'App\Domains\Azkar\Data',
        'App\Domains\Content\Packs',
        'App\Domains\Content\Models',
    ])
    ->not->toUse('App\Integrations\Dorar');

arch('content models extend eloquent')
    ->expect('App\Domains\Content\Models')
    ->toExtend(Model::class);

// ADR 0060 decision 8: the Taybah timing importer reads committed files only, never a storage SDK.
arch('the Taybah importer reads no storage SDK')
    ->expect('App\Domains\Content\Services\TaybahTimingImporter')
    ->not->toUse(['Aws', 'League\Flysystem\AwsS3V3']);

// ADR 0061 decision 8: the MP3Quran import reads the committed manifest only, never a storage SDK.
arch('the app uses no storage SDK')
    ->expect('App')
    ->not->toUse(['Aws']);

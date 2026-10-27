<?php

declare(strict_types=1);

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

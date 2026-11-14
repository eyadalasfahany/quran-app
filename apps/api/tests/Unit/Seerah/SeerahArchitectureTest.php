<?php

declare(strict_types=1);

use Illuminate\Database\Eloquent\Model;

// ADR 0089 layering for the Seerah import and catalogue (spec section 3, ADR 0002).

arch('seerah models extend eloquent and never shape HTTP')
    ->expect('App\Domains\Seerah\Models')
    ->toExtend(Model::class)
    ->not->toUse(['Illuminate\Http', 'Symfony\Component\HttpFoundation']);

arch('the seerah importer and its row builder never touch HTTP or the request')
    ->expect('App\Domains\Seerah\Import')
    ->not->toUse(['Illuminate\Http', 'Symfony\Component\HttpFoundation', 'Illuminate\Support\Facades\Request']);

arch('the seerah repositories never open transactions or use the DB facade')
    ->expect('App\Domains\Seerah\Repositories')
    ->not->toUse(['Illuminate\Support\Facades\DB']);

arch('seerah repository contracts are interfaces')
    ->expect('App\Domains\Seerah\Repositories\Contracts')
    ->toBeInterfaces();

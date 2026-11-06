<?php

declare(strict_types=1);

// Layering for step 5 (ADR 0042 §3, integrations.md). The records are plain PHP so step 3 has no coupling to them.

arch('the fawazahmed0 client imports no domain')
    ->expect('App\Integrations\HadithApiFawaz')
    ->not->toUse('App\Domains');

arch('hadith source records are plain PHP')
    ->expect('App\Domains\Hadith\Sources\Records')
    ->not->toUse(['Illuminate\Database', 'Spatie\LaravelData', 'Illuminate\Http']);

arch('hadith source code and the fawazahmed0 transport use strict types')
    ->expect(['App\Domains\Hadith', 'App\Integrations\HadithApiFawaz'])
    ->toUseStrictTypes();

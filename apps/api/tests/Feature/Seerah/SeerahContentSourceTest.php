<?php

declare(strict_types=1);

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

// The openiti row is created by the hadith migration (ADR 0076). Seerah reuses it: exactly one row, never a second.
uses(RefreshDatabase::class);

it('has exactly one openiti content source row, shared with the hadith chapters', function (): void {
    expect(DB::table('content_sources')->where('code', 'openiti')->count())->toBe(1)
        ->and(DB::table('content_sources')->where('code', 'openiti')->value('permission_status'))->toBe('granted');
});

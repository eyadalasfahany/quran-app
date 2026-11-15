<?php

declare(strict_types=1);

namespace Database\Factories\Concerns;

use Illuminate\Support\Facades\DB;

/**
 * Placeholder Seerah rows need a seerah resource and the openiti source (ADR 0091). Both are created once per test database.
 */
trait CreatesSeerahResource
{
    protected function seerahSourceId(): int
    {
        $existing = DB::table('content_sources')->where('code', 'openiti')->value('id');

        if (is_numeric($existing)) {
            return (int) $existing;
        }

        return (int) DB::table('content_sources')->insertGetId([
            'code' => 'openiti',
            'name' => 'FIXTURE openiti',
            'licence_url' => 'https://example.com/licence',
            'attribution_ar' => 'FIXTURE',
            'attribution_en' => 'FIXTURE',
            'permission_status' => 'not_required',
            'notes' => 'FIXTURE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function seerahResourceId(string $slug = 'fixture-seerah-book'): int
    {
        $existing = DB::table('resources')
            ->where('group', 'seerah')
            ->where('source_key', $slug)
            ->value('id');

        if (is_numeric($existing)) {
            return (int) $existing;
        }

        return (int) DB::table('resources')->insertGetId([
            'source_id' => $this->seerahSourceId(),
            'group' => 'seerah',
            'source_key' => $slug,
            'name' => 'FIXTURE seerah book',
            'language_code' => 'ar',
            'direction' => 'rtl',
            'version' => 1,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

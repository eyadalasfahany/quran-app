<?php

declare(strict_types=1);

namespace Database\Factories\Concerns;

use Illuminate\Support\Facades\DB;

trait CreatesHadithResource
{
    protected function hadithSourceId(): int
    {
        $existing = DB::table('content_sources')->where('code', 'fawazahmed0')->value('id');

        if (is_numeric($existing)) {
            return (int) $existing;
        }

        return (int) DB::table('content_sources')->insertGetId([
            'code' => 'fawazahmed0',
            'name' => 'FIXTURE fawazahmed0',
            'licence_url' => 'https://example.com/licence',
            'attribution_ar' => 'FIXTURE',
            'attribution_en' => 'FIXTURE',
            'permission_status' => 'not_required',
            'notes' => 'FIXTURE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function hadithResourceId(string $slug = 'fixture-collection'): int
    {
        $existing = DB::table('resources')
            ->where('group', 'hadith_collections')
            ->where('source_key', $slug)
            ->value('id');

        if (is_numeric($existing)) {
            return (int) $existing;
        }

        return (int) DB::table('resources')->insertGetId([
            'source_id' => $this->hadithSourceId(),
            'group' => 'hadith_collections',
            'source_key' => $slug,
            'name' => 'FIXTURE hadith collection',
            'language_code' => 'ar',
            'direction' => 'rtl',
            'version' => 1,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

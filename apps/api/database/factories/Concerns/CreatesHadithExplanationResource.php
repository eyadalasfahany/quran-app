<?php

declare(strict_types=1);

namespace Database\Factories\Concerns;

use Illuminate\Support\Facades\DB;

trait CreatesHadithExplanationResource
{
    protected function hadithExplanationSourceId(): int
    {
        $existing = DB::table('content_sources')->where('code', 'hadeethenc')->value('id');

        if (is_numeric($existing)) {
            return (int) $existing;
        }

        return (int) DB::table('content_sources')->insertGetId([
            'code' => 'hadeethenc',
            'name' => 'FIXTURE HadeethEnc',
            'licence_url' => 'https://example.com/licence',
            'attribution_ar' => 'FIXTURE',
            'attribution_en' => 'FIXTURE',
            'permission_status' => 'granted',
            'notes' => 'FIXTURE',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function hadithExplanationResourceId(): int
    {
        $existing = DB::table('resources')
            ->where('group', 'hadith_explanations')
            ->where('source_key', 'hadeethenc')
            ->value('id');

        if (is_numeric($existing)) {
            return (int) $existing;
        }

        return (int) DB::table('resources')->insertGetId([
            'source_id' => $this->hadithExplanationSourceId(),
            'group' => 'hadith_explanations',
            'source_key' => 'hadeethenc',
            'name' => 'FIXTURE explanations',
            'language_code' => 'ar',
            'direction' => 'rtl',
            'version' => 1,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

<?php

declare(strict_types=1);

namespace Database\Factories\Concerns;

use Illuminate\Support\Facades\DB;

trait CreatesDuasResource
{
    protected function duasResourceId(): int
    {
        $existing = DB::table('resources')
            ->where('group', 'duas')
            ->where('source_key', 'ar-duas')
            ->value('id');

        if (is_int($existing)) {
            return $existing;
        }

        $sourceId = DB::table('content_sources')->where('code', 'hadeethenc')->value('id');

        if (! is_int($sourceId)) {
            $sourceId = DB::table('content_sources')->insertGetId([
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

        return (int) DB::table('resources')->insertGetId([
            'source_id' => $sourceId,
            'group' => 'duas',
            'source_key' => 'ar-duas',
            'name' => 'FIXTURE duas pack',
            'language_code' => 'ar',
            'direction' => 'rtl',
            'version' => 1,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

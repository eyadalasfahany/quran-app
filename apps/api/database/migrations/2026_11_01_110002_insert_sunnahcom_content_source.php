<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0042 §8: Sunnah.com is the long-term hadith source. Its row starts pending until the written terms are read.
 * Insert-only: an existing row is left as it is.
 */
return new class extends Migration
{
    private const string CODE = 'sunnahcom';

    public function up(): void
    {
        if (DB::table('content_sources')->where('code', self::CODE)->exists()) {
            return;
        }

        $now = now();

        DB::table('content_sources')->insert([
            'code' => self::CODE,
            'name' => 'Sunnah.com',
            'licence_url' => 'https://sunnah.com/developers',
            'attribution_ar' => '',
            'attribution_en' => 'Sunnah.com',
            'permission_status' => 'pending',
            'notes' => 'API key requested 1 Nov 2026. Written terms not yet received. The long-term source (ADR 0042 §8); a later migration sets this to granted after the developer reads the terms (the ADR 0038 pattern).',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('content_sources')->where('code', self::CODE)->delete();
    }
};

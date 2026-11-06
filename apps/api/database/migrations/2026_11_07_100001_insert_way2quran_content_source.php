<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0074 decision 5: Way2Quran is the content source of the reciters hosted on R2. The row is upserted so a local
 * row converges to these values. The attribution is neutral and names the producer Midad (ADR 0074 decision 2). The
 * developer's permission was given verbally on 7 Nov 2026; no wording is quoted here.
 */
return new class extends Migration
{
    private const string CODE = 'way2quran';

    public function up(): void
    {
        DB::table('content_sources')->updateOrInsert(
            ['code' => self::CODE],
            function (bool $exists): array {
                $values = [
                    'name' => 'Way2Quran',
                    'licence_url' => 'https://way2quran.com',
                    'attribution_ar' => 'Way2Quran (way2quran.com)',
                    'attribution_en' => 'Way2Quran (way2quran.com)',
                    'permission_status' => 'granted',
                    'notes' => 'Permission was given verbally to the developer on 7 Nov 2026 for Way2Quran reciters: hosting on R2, offline download and timings derived from the audio. Recordings are tagged as produced by Midad (www.midad.com). No wording is quoted here (ADR 0074 decisions 1 and 2).',
                    'updated_at' => now(),
                ];

                return $exists ? $values : [...$values, 'created_at' => now()];
            },
        );
    }

    /**
     * No-op: the rows may be referenced by resources, and a rollback must not delete them.
     */
    public function down(): void
    {
        // Intentionally empty.
    }
};

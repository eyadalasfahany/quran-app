<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0061: MP3Quran is the content source of the reciters hosted on R2. The row is upserted so the local pilot row
 * converges to these values. The attribution wording is provisional and neutral until the developer approves it
 * (plan B2/B3); the developer's written permission is not quoted here (ADR 0061 decision 1).
 */
return new class extends Migration
{
    private const string CODE = 'mp3quran';

    public function up(): void
    {
        DB::table('content_sources')->updateOrInsert(
            ['code' => self::CODE],
            function (bool $exists): array {
                $values = [
                    'name' => 'MP3Quran',
                    'licence_url' => 'https://www.mp3quran.net',
                    'attribution_ar' => 'MP3Quran (mp3quran.net)',
                    'attribution_en' => 'MP3Quran (mp3quran.net)',
                    'permission_status' => 'granted',
                    'notes' => 'Written permission is held by the developer; its wording is not quoted here (ADR 0061 decision 1).',
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

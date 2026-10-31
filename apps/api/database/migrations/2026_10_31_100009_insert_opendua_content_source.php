<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0031 §1: OpenDua is the Azkar source. Its row stays pending until OpenDua confirms the Arabic
 * redistribution rights in writing, so the pack builder and the manifest refuse it.
 */
return new class extends Migration
{
    private const string CODE = 'opendua';

    public function up(): void
    {
        if (DB::table('content_sources')->where('code', self::CODE)->exists()) {
            return;
        }

        $now = now();

        DB::table('content_sources')->insert([
            'code' => self::CODE,
            'name' => 'OpenDua',
            'licence_url' => 'https://opendua.hdfund.org/developers#dev-licence',
            'attribution_ar' => '',
            'attribution_en' => "OpenDua dataset v0.0.4 (https://opendua.org), by Ihsan Labs at the Human Development Fund. Based on Hisn al-Muslim by Sa'id ibn Ali ibn Wahf al-Qahtani. OpenDua editorial text and dataset structure are licensed CC BY 4.0. Recitation by Muhammad Jumah for OpenDua. OpenDua makes no ownership claim over the underlying religious texts.",
            'permission_status' => 'pending',
            'notes' => "Arabic attribution pending OpenDua's wording",
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('content_sources')->where('code', self::CODE)->delete();
    }
};

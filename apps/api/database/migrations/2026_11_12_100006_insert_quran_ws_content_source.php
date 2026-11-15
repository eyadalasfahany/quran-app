<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0090 decision 12: the quran-svg page artwork and ayah polygons, from quran.ws (CC BY 4.0). Provenance only, so the
 * permission status is `not_required` (developer decision, 12 Nov 2026).
 */
return new class extends Migration
{
    private const string CODE = 'quran_ws';

    public function up(): void
    {
        if (DB::table('content_sources')->where('code', self::CODE)->exists()) {
            return;
        }

        $now = now();

        DB::table('content_sources')->insert([
            'code' => self::CODE,
            'name' => 'quran.ws (quran-svg, King Fahd Glorious Qur\'an Printing Complex)',
            'licence_url' => 'https://github.com/quran-ws/quran-svg',
            'attribution_ar' => '',
            'attribution_en' => 'Page artwork: King Fahd Glorious Qur\'an Printing Complex. Ayah polygons: quran.ws (quran-svg), CC BY 4.0.',
            'permission_status' => 'not_required',
            'notes' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('content_sources')->where('code', self::CODE)->delete();
    }
};

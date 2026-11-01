<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0031 §12: hisnmuslim.com is a second Azkar source. Its row starts pending: no terms are published, so the pack
 * builder and the manifest refuse it until written permission arrives. Insert-only: an existing row is left as it is.
 */
return new class extends Migration
{
    private const string CODE = 'hisnmuslim';

    public function up(): void
    {
        if (DB::table('content_sources')->where('code', self::CODE)->exists()) {
            return;
        }

        $now = now();

        DB::table('content_sources')->insert([
            'code' => self::CODE,
            'name' => 'hisnmuslim.com',
            'licence_url' => 'https://www.hisnmuslim.com/',
            'attribution_ar' => 'حصن المسلم، موقع hisnmuslim.com',
            'attribution_en' => 'Hisn al-Muslim text from hisnmuslim.com. No terms are published; import stays locked until written permission.',
            'permission_status' => 'pending',
            'notes' => 'Locked until written permission (ADR 0031 §12). Its translation and audio are not stored.',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('content_sources')->where('code', self::CODE)->delete();
    }
};

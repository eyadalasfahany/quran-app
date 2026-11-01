<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0031 §12: HadeethEnc enriches Azkar entries with explanation, grade and reference notes. Its row starts pending
 * until the written confirmation the content plan asks for. Insert-only: an existing row is left as it is.
 */
return new class extends Migration
{
    private const string CODE = 'hadeethenc';

    public function up(): void
    {
        if (DB::table('content_sources')->where('code', self::CODE)->exists()) {
            return;
        }

        $now = now();

        DB::table('content_sources')->insert([
            'code' => self::CODE,
            'name' => 'HadeethEnc',
            'licence_url' => 'https://hadeethenc.com/api-docs/',
            'attribution_ar' => 'موسوعة الأحاديث النبوية HadeethEnc.com',
            'attribution_en' => 'HadeethEnc.com — Encyclopedia of Translated Prophetic Hadiths',
            'permission_status' => 'pending',
            'notes' => 'Explanations, grades and references only. Benefits («الفوائد») are not stored (ADR 0031 §12).',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('content_sources')->where('code', self::CODE)->delete();
    }
};

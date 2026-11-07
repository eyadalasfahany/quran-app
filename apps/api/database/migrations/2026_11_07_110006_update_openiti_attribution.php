<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * OpenITI now supplies book titles as well as chapter titles (ADR 0076, 7 Nov 2026), so its credit names both. Updates the
 * openiti row only. down() restores the wording of 2026_11_07_110001, copied from that migration's constants.
 */
return new class extends Migration
{
    private const string CODE = 'openiti';

    private const string ATTRIBUTION_AR = 'عناوين الكتب والأبواب وبعض نصوص الأحاديث: مشروع OpenITI (الإصدار 2023.1.8)، بترخيص CC BY-NC-SA 4.0';

    private const string ATTRIBUTION_EN = 'Book and chapter titles and some hadith texts: OpenITI (release 2023.1.8), CC BY-NC-SA 4.0';

    /** The wording before this migration, copied from 2026_11_07_110001. */
    private const string PREVIOUS_ATTRIBUTION_AR = 'عناوين الأبواب وبعض نصوص الأحاديث: مشروع OpenITI (الإصدار 2023.1.8)، بترخيص CC BY-NC-SA 4.0';

    private const string PREVIOUS_ATTRIBUTION_EN = 'Chapter titles and some hadith texts: OpenITI (release 2023.1.8), CC BY-NC-SA 4.0';

    public function up(): void
    {
        DB::table('content_sources')->where('code', self::CODE)->update([
            'attribution_ar' => self::ATTRIBUTION_AR,
            'attribution_en' => self::ATTRIBUTION_EN,
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('content_sources')->where('code', self::CODE)->update([
            'attribution_ar' => self::PREVIOUS_ATTRIBUTION_AR,
            'attribution_en' => self::PREVIOUS_ATTRIBUTION_EN,
            'updated_at' => now(),
        ]);
    }
};

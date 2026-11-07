<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0076 gap-report extension, 7 Nov 2026: two provenance rows for the dataset gap fills. Both datasets are derived from
 * Sunnah.com. meeatif: uploader's MIT claim (Hugging Face). hadithjson: no licence at all. Both rows stay pending: provenance
 * only, no permission is granted. Upserted so a local row converges to these values; down() removes both.
 */
return new class extends Migration
{
    private const string MEEATIF_CODE = 'meeatif';

    private const string HADITHJSON_CODE = 'hadithjson';

    private const string MEEATIF_ATTRIBUTION_AR = 'بعض نصوص الأحاديث: مجموعة بيانات meeAtif/hadith_datasets';

    private const string MEEATIF_ATTRIBUTION_EN = 'Some hadith texts: meeAtif/hadith_datasets dataset';

    private const string MEEATIF_NOTES = 'sunnah.com-derived dataset; licence: uploader MIT claim';

    private const string HADITHJSON_ATTRIBUTION_AR = 'بعض نصوص الأحاديث: مجموعة بيانات hadith-json';

    private const string HADITHJSON_ATTRIBUTION_EN = 'Some hadith texts: hadith-json dataset';

    private const string HADITHJSON_NOTES = 'sunnah.com-derived dataset; no licence';

    public function up(): void
    {
        DB::table('content_sources')->updateOrInsert(
            ['code' => self::MEEATIF_CODE],
            function (bool $exists): array {
                $values = [
                    'name' => 'meeAtif/hadith_datasets (Hugging Face)',
                    'licence_url' => 'https://huggingface.co/datasets/meeAtif/hadith_datasets',
                    'attribution_ar' => self::MEEATIF_ATTRIBUTION_AR,
                    'attribution_en' => self::MEEATIF_ATTRIBUTION_EN,
                    'permission_status' => 'pending',
                    'notes' => self::MEEATIF_NOTES,
                    'updated_at' => now(),
                ];

                return $exists ? $values : [...$values, 'created_at' => now()];
            },
        );

        DB::table('content_sources')->updateOrInsert(
            ['code' => self::HADITHJSON_CODE],
            function (bool $exists): array {
                $values = [
                    'name' => 'AhmedBaset/hadith-json (GitHub)',
                    'licence_url' => 'https://github.com/AhmedBaset/hadith-json',
                    'attribution_ar' => self::HADITHJSON_ATTRIBUTION_AR,
                    'attribution_en' => self::HADITHJSON_ATTRIBUTION_EN,
                    'permission_status' => 'pending',
                    'notes' => self::HADITHJSON_NOTES,
                    'updated_at' => now(),
                ];

                return $exists ? $values : [...$values, 'created_at' => now()];
            },
        );
    }

    public function down(): void
    {
        DB::table('content_sources')->whereIn('code', [self::MEEATIF_CODE, self::HADITHJSON_CODE])->delete();
    }
};

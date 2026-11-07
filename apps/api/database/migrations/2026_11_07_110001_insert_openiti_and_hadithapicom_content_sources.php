<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0076 §8.2 and the gap-report decisions of 7 Nov 2026: two provenance rows for Phase 7 step 6b.
 * openiti: chapter titles and the text of some hadith that fawazahmed0 lacks (CC BY-NC-SA 4.0, granted by the licence).
 * hadithapicom: the text of a few hadith that neither fawazahmed0 nor OpenITI has (no published terms; RB16, accepted by
 * the developer). Both rows are upserted so a local row converges to these values; down() removes both.
 */
return new class extends Migration
{
    private const string OPENITI_CODE = 'openiti';

    private const string HADITHAPICOM_CODE = 'hadithapicom';

    private const string OPENITI_ATTRIBUTION_AR = 'عناوين الأبواب وبعض نصوص الأحاديث: مشروع OpenITI (الإصدار 2023.1.8)، بترخيص CC BY-NC-SA 4.0';

    private const string OPENITI_ATTRIBUTION_EN = 'Chapter titles and some hadith texts: OpenITI (release 2023.1.8), CC BY-NC-SA 4.0';

    private const string OPENITI_NOTES = 'Zenodo release 2023.1.8, version DOI 10.5281/zenodo.10007820, licence CC BY-NC-SA 4.0 (granted by the licence; provenance only, ADR 0076 §8.2). Tirmidhi\'s Sunan is not in that release: pinned to GitHub OpenITI/0300AH commit 01a1544130e0236850ef2698923ad01575c5bd7c, same licence. Used for chapter titles and number ranges, and for the text of hadith numbers that fawazahmed0 lacks (ADR 0076, 7 Nov 2026). Shamela-derived; upstream rights as RB13/RB21. ShareAlike applies to the chapter data and to the filled text.';

    private const string HADITHAPICOM_ATTRIBUTION_AR = 'بعض نصوص الأحاديث: hadithapi.com';

    private const string HADITHAPICOM_ATTRIBUTION_EN = 'Some hadith texts: hadithapi.com';

    private const string HADITHAPICOM_NOTES = 'hadithapi.com publishes no terms. The developer accepted the risk on 7 Nov 2026 (ADR 0076 gap-report decision 8, RB16). Text of a few hadith that neither fawazahmed0 nor OpenITI has, produced locally with a dev-only key and committed as pinned data files; never fetched in production.';

    public function up(): void
    {
        DB::table('content_sources')->updateOrInsert(
            ['code' => self::OPENITI_CODE],
            function (bool $exists): array {
                $values = [
                    'name' => 'OpenITI (Open Islamicate Texts Initiative)',
                    'licence_url' => 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
                    'attribution_ar' => self::OPENITI_ATTRIBUTION_AR,
                    'attribution_en' => self::OPENITI_ATTRIBUTION_EN,
                    'permission_status' => 'granted',
                    'notes' => self::OPENITI_NOTES,
                    'updated_at' => now(),
                ];

                return $exists ? $values : [...$values, 'created_at' => now()];
            },
        );

        DB::table('content_sources')->updateOrInsert(
            ['code' => self::HADITHAPICOM_CODE],
            function (bool $exists): array {
                $values = [
                    'name' => 'hadithapi.com',
                    'licence_url' => 'https://hadithapi.com',
                    'attribution_ar' => self::HADITHAPICOM_ATTRIBUTION_AR,
                    'attribution_en' => self::HADITHAPICOM_ATTRIBUTION_EN,
                    'permission_status' => 'pending',
                    'notes' => self::HADITHAPICOM_NOTES,
                    'updated_at' => now(),
                ];

                return $exists ? $values : [...$values, 'created_at' => now()];
            },
        );
    }

    public function down(): void
    {
        DB::table('content_sources')->whereIn('code', [self::OPENITI_CODE, self::HADITHAPICOM_CODE])->delete();
    }
};

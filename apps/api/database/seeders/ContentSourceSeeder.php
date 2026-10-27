<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Content\Enums\PermissionStatus;
use App\Domains\Content\Models\ContentSource;
use Illuminate\Database\Seeder;

class ContentSourceSeeder extends Seeder
{
    /**
     * Seed the licensed content sources. Safe to run more than once.
     */
    public function run(): void
    {
        $sources = [
            [
                'code' => 'qf',
                'name' => 'Quran Foundation',
                'licence_url' => 'https://api-docs.quran.foundation/legal/developer-terms/',
                'permission_status' => PermissionStatus::Granted,
                'attribution_en' => 'Quran content from Quran Foundation (quran.foundation)',
                'attribution_ar' => 'محتوى القرآن من مؤسسة القرآن (quran.foundation)',
            ],
            [
                'code' => 'tanzil',
                'name' => 'Tanzil Project',
                'licence_url' => 'https://tanzil.net/docs/text_license',
                'permission_status' => PermissionStatus::NotRequired,
                'attribution_en' => 'Quran text from the Tanzil Project (tanzil.net), CC BY 3.0',
                'attribution_ar' => 'نص القرآن من مشروع تنزيل (tanzil.net)، برخصة CC BY 3.0',
            ],
        ];

        foreach ($sources as $source) {
            ContentSource::query()->updateOrCreate(
                ['code' => $source['code']],
                $source,
            );
        }
    }
}

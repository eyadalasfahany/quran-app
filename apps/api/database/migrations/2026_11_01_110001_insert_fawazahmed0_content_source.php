<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0042 §3: fawazahmed0/hadith-api is the hadith source, pinned to one commit in config/hadith.php. Its row is
 * granted as not_required with the Unlicense and a provenance note. Insert-only: an existing row is left as it is.
 */
return new class extends Migration
{
    private const string CODE = 'fawazahmed0';

    public function up(): void
    {
        if (DB::table('content_sources')->where('code', self::CODE)->exists()) {
            return;
        }

        $now = now();

        DB::table('content_sources')->insert([
            'code' => self::CODE,
            'name' => 'fawazahmed0/hadith-api',
            'licence_url' => 'https://github.com/fawazahmed0/hadith-api/blob/df57907be35291c91ad6a6691180e22ca9920784/LICENSE',
            'attribution_ar' => 'المصدر: fawazahmed0/hadith-api (الترخيص: Unlicense)',
            'attribution_en' => 'Source: fawazahmed0/hadith-api (Unlicense)',
            'permission_status' => 'not_required',
            'notes' => 'Unlicense from the repository author. Edition metadata lists the author as "Unknown"; References.md lists upstream sites (sunnah.com, al-maktaba.org/Shamela and others), and the Unlicense does not by itself clear those upstream rights. Accepted by the developer for now (ADR 0042 §3, RB13). Grades are stored and hidden (hadith.grades_visible = false). Pinned commit df57907be35291c91ad6a6691180e22ca9920784.',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('content_sources')->where('code', self::CODE)->delete();
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0038: OpenDua's Arabic text and attribution are accepted on its public statements (opendua.org/developers,
 * checked 1 Nov 2026), so the source becomes granted. The import flag and the reviewed Quran map remain the
 * production locks; audio is not covered.
 */
return new class extends Migration
{
    private const string CODE = 'opendua';

    public function up(): void
    {
        DB::table('content_sources')
            ->where('code', self::CODE)
            ->update([
                'permission_status' => 'granted',
                'licence_url' => 'https://opendua.org/developers',
                'notes' => "Granted by ADR 0038 on OpenDua's public statements (1 Nov 2026). Arabic attribution not published by OpenDua. Audio not licensed.",
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('content_sources')
            ->where('code', self::CODE)
            ->update([
                'permission_status' => 'pending',
                'licence_url' => 'https://opendua.hdfund.org/developers#dev-licence',
                'notes' => "Arabic attribution pending OpenDua's wording",
                'updated_at' => now(),
            ]);
    }
};

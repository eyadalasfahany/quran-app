<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0042 (developer decision, 1 Nov 2026): hisnmuslim.com and HadeethEnc are granted without written terms. Neither
 * publishes terms that cover this use; the developer accepts the risk. The rollback is a reviewed migration back to pending (ADR 0045: no config switch) and this migration's
 * down(), which sets both rows back to pending. Production still needs the reviewed Quran map (ADR 0031 §11).
 */
return new class extends Migration
{
    private const array CODES = ['hisnmuslim', 'hadeethenc'];

    private const string NOTES = 'Granted by developer decision (ADR 0042, 1 Nov 2026) without written terms. Risk accepted; rollback is a reviewed migration back to pending (ADR 0045: no config switch).';

    public function up(): void
    {
        DB::table('content_sources')
            ->whereIn('code', self::CODES)
            ->update([
                'permission_status' => 'granted',
                'notes' => self::NOTES,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('content_sources')
            ->whereIn('code', self::CODES)
            ->update([
                'permission_status' => 'pending',
                'notes' => 'Locked until written permission (ADR 0031 §12).',
                'updated_at' => now(),
            ]);
    }
};

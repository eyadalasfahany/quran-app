<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0043 A2: the Names list stays pending until step N1 is recorded and a reviewed grant migration runs.
 * Import and pack build refuse until permission_status is granted.
 */
return new class extends Migration
{
    private const string CODE = 'names-tirmidhi';

    public function up(): void
    {
        if (DB::table('content_sources')->where('code', self::CODE)->exists()) {
            return;
        }

        $now = now();

        DB::table('content_sources')->insert([
            'code' => self::CODE,
            'name' => '99 Names (Tirmidhī list)',
            'licence_url' => 'https://example.invalid/names-pending',
            'attribution_ar' => '',
            'attribution_en' => '',
            'permission_status' => 'pending',
            'notes' => 'Awaiting step N1 (edition, transcriber, reviewer) and rights decision. See apps/api/database/data/names/SOURCE.md.',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('content_sources')->where('code', self::CODE)->delete();
    }
};

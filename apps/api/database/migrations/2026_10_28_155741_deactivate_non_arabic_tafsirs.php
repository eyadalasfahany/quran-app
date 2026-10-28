<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0015: tafsir text is Arabic only. Rows stay (ids are stable); their data goes.
 */
return new class extends Migration
{
    public function up(): void
    {
        $resourceIds = DB::table('resources')
            ->where('group', 'tafsirs')
            ->where(function ($query): void {
                $query->whereNull('language_code')->orWhere('language_code', '!=', 'ar');
            })
            ->pluck('id')
            ->all();

        if ($resourceIds === []) {
            return;
        }

        DB::table('tafsir_entries')->whereIn('resource_id', $resourceIds)->delete();
        DB::table('content_changes')->whereIn('resource_id', $resourceIds)->delete();
        DB::table('content_packs')->whereIn('resource_id', $resourceIds)->delete();
        DB::table('resources')->whereIn('id', $resourceIds)->update(['is_active' => false]);
    }

    public function down(): void
    {
        // Deleted entries and packs cannot be restored. The next content sync rebuilds them.
    }
};

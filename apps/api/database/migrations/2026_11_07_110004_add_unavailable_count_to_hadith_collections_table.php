<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0076 «Rule amended, 7 Nov 2026»: the number of placeholder rows (unavailable) of a collection. The importer sets it; it is
 * server-only and not in the pack (PackSchema).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hadith_collections', function (Blueprint $table): void {
            $table->unsignedInteger('unavailable_count')->default(0)->after('incomplete_count');
        });
    }

    public function down(): void
    {
        Schema::table('hadith_collections', function (Blueprint $table): void {
            $table->dropColumn(['unavailable_count']);
        });
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0076 «Rule, 7 Nov 2026»: a collection is served only when every hadith number is resolved. is_complete is set by the
 * importer; the default false means a row the importer did not write is never served. Not in the pack (PackSchema).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hadith_collections', function (Blueprint $table): void {
            $table->boolean('is_complete')->default(false)->after('books_count');
            $table->unsignedInteger('incomplete_count')->default(0)->after('is_complete');
        });
    }

    public function down(): void
    {
        Schema::table('hadith_collections', function (Blueprint $table): void {
            $table->dropColumn(['is_complete', 'incomplete_count']);
        });
    }
};

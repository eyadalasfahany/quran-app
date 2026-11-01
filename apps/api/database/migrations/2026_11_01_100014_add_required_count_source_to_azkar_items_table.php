<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0031 §6 and §12 (developer, 1 Nov 2026): where a required_count came from, 'opendua' or 'hisnmuslim'.
 * Server-side provenance only. The pack schema does not list this column, so the app never receives it.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('azkar_items', function (Blueprint $table): void {
            $table->string('required_count_source', 32)->nullable()->after('required_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('azkar_items', function (Blueprint $table): void {
            $table->dropColumn('required_count_source');
        });
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0031 §6: a repeat group in the OpenDua steps keeps its index and count on each flattened item.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('azkar_items', function (Blueprint $table): void {
            $table->unsignedInteger('repeat_group')->nullable()->after('source_text_sha256');
            $table->unsignedInteger('repeat_times')->nullable()->after('repeat_group');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('azkar_items', function (Blueprint $table): void {
            $table->dropColumn(['repeat_group', 'repeat_times']);
        });
    }
};

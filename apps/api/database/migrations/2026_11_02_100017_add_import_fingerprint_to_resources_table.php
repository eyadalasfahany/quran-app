<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Plan step 14 §3: the content fingerprint of the last Azkar import. A re-import whose rows hash to the same value does
 * not bump the resource version or rebuild the pack. Server-side only; the pack schema does not list this column.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table): void {
            $table->char('import_fingerprint', 64)->nullable()->after('checksum');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table): void {
            $table->dropColumn('import_fingerprint');
        });
    }
};

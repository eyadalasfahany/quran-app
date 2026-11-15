<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0090: in the Warsh, Qalun and al-Duri page files, an ayah that runs on from the previous page is listed with
 * `continuation: true` and no label point. Its region row keeps a null label.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('svg_mushaf_ayah_regions', function (Blueprint $table): void {
            $table->decimal('label_x', 8, 2)->nullable()->change();
            $table->decimal('label_y', 8, 2)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('svg_mushaf_ayah_regions', function (Blueprint $table): void {
            $table->decimal('label_x', 8, 2)->nullable(false)->change();
            $table->decimal('label_y', 8, 2)->nullable(false)->change();
        });
    }
};

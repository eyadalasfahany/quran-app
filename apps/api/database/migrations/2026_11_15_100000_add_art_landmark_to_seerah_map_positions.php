<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0091 (amendment): true when the place's own marker is drawn in the level's art at its position (the Prophet's Mosque,
 * Quba, the Kaaba), so a cluster that holds it is drawn on the marker.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seerah_map_positions', function (Blueprint $table): void {
            $table->boolean('art_landmark')->default(false)->after('label_side');
        });
    }

    public function down(): void
    {
        Schema::table('seerah_map_positions', function (Blueprint $table): void {
            $table->dropColumn('art_landmark');
        });
    }
};

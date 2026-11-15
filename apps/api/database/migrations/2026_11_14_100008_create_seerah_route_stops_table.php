<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0091, Phase 8 step 22: route stops. Arabic text is stored byte-for-byte (utf8mb4_0900_bin); the rows are replaced on every
 * import (seerah:import), so the keys are the import's own ids.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seerah_route_stops', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('route_id');
            $table->unsignedInteger('position');
            $table->unsignedInteger('place_id');
            $table->primary(['resource_id', 'route_id', 'position']);
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seerah_route_stops');
    }
};

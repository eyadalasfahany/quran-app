<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0089, Phase 8 step 22: map levels. Arabic text is stored byte-for-byte (utf8mb4_0900_bin); the rows are replaced on every
 * import (seerah:import), so the keys are the import's own ids.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seerah_map_levels', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->string('level', 16);
            $table->unsignedInteger('parent_place_id');
            $table->string('viewbox', 64);
            $table->string('art', 255);
            $table->primary(['resource_id', 'level']);
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seerah_map_levels');
    }
};

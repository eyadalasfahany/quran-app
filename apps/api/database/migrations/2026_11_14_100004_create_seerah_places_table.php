<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0091, Phase 8 step 22: places. Arabic text is stored byte-for-byte (utf8mb4_0900_bin); the rows are replaced on every
 * import (seerah:import), so the keys are the import's own ids.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seerah_places', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->string('slug', 96);
            $table->unsignedInteger('parent_id')->nullable();
            $table->string('kind', 16);
            $table->string('name_ar', 200)->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->decimal('lat', 9, 6)->nullable();
            $table->decimal('lng', 9, 6)->nullable();
            $table->string('geo_precision', 16)->nullable();
            $table->string('geo_source', 64)->nullable();
            $table->json('flags');
            $table->primary(['resource_id', 'id']);
            $table->unique(['resource_id', 'slug'], 'seerah_places_slug_unique');
            $table->index(['resource_id', 'parent_id'], 'seerah_places_parent_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seerah_places');
    }
};

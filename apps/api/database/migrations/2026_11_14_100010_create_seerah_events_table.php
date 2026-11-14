<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0089, Phase 8 step 22: events. Arabic text is stored byte-for-byte (utf8mb4_0900_bin); the rows are replaced on every
 * import (seerah:import), so the keys are the import's own ids.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seerah_events', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->string('slug', 16);
            $table->unsignedInteger('position');
            $table->unsignedInteger('section_id');
            $table->unsignedInteger('paragraph_from')->nullable();
            $table->unsignedInteger('paragraph_to')->nullable();
            $table->text('title_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->string('kind', 16);
            $table->unsignedInteger('place_id')->nullable();
            $table->string('place_basis', 16)->nullable();
            $table->json('also');
            $table->unsignedInteger('age_from')->nullable();
            $table->unsignedInteger('age_to')->nullable();
            $table->string('era', 4)->nullable();
            $table->unsignedInteger('hijri_from')->nullable();
            $table->unsignedInteger('hijri_to')->nullable();
            $table->string('year_basis', 24)->nullable();
            $table->string('certainty', 24)->nullable();
            $table->unsignedInteger('route_id')->nullable();
            $table->json('flags');
            $table->primary(['resource_id', 'id']);
            $table->unique(['resource_id', 'slug'], 'seerah_events_slug_unique');
            $table->index(['resource_id', 'position'], 'seerah_events_position_index');
            $table->index(['resource_id', 'age_from'], 'seerah_events_age_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seerah_events');
    }
};

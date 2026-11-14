<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0089, Phase 8 step 22: sections. Arabic text is stored byte-for-byte (utf8mb4_0900_bin); the rows are replaced on every
 * import (seerah:import), so the keys are the import's own ids.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seerah_sections', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->string('code', 8);
            $table->string('level', 16);
            $table->text('title_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->unsignedInteger('page');
            $table->unsignedInteger('position');
            $table->unsignedInteger('paragraph_from')->nullable();
            $table->unsignedInteger('paragraph_to')->nullable();
            $table->primary(['resource_id', 'id']);
            $table->unique(['resource_id', 'code'], 'seerah_sections_code_unique');
            $table->index(['resource_id', 'position'], 'seerah_sections_position_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seerah_sections');
    }
};

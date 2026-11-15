<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0091, Phase 8 step 22: paragraphs. Arabic text is stored byte-for-byte (utf8mb4_0900_bin); the rows are replaced on every
 * import (seerah:import), so the keys are the import's own ids.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seerah_paragraphs', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->string('code', 8);
            $table->unsignedInteger('section_id');
            $table->unsignedInteger('position');
            $table->unsignedInteger('page');
            $table->mediumText('text_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->char('text_sha256', 64);
            $table->primary(['resource_id', 'id']);
            $table->unique(['resource_id', 'code'], 'seerah_paragraphs_code_unique');
            $table->index(['resource_id', 'section_id', 'position'], 'seerah_paragraphs_section_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seerah_paragraphs');
    }
};

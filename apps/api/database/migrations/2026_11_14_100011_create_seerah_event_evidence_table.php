<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0089, Phase 8 step 22: event evidence. Arabic text is stored byte-for-byte (utf8mb4_0900_bin); the rows are replaced on every
 * import (seerah:import), so the keys are the import's own ids.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seerah_event_evidence', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('event_id');
            $table->string('kind', 8);
            $table->unsignedInteger('position');
            $table->unsignedInteger('paragraph_id');
            $table->text('quote_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->primary(['resource_id', 'event_id', 'kind', 'position']);
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seerah_event_evidence');
    }
};

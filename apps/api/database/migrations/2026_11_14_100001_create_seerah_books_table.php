<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0089, Phase 8 step 22: books. Arabic text is stored byte-for-byte (utf8mb4_0900_bin); the rows are replaced on every
 * import (seerah:import), so the keys are the import's own ids.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seerah_books', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->string('slug', 32);
            $table->string('title_ar', 200)->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->string('author_ar', 200)->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->string('edition_ar', 200)->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->text('attribution_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->text('attribution_en');
            $table->foreignId('source_id');
            $table->string('source_version', 64);
            $table->char('source_sha256', 64);
            $table->char('canonical_sha256', 64);
            $table->unsignedInteger('sections_count');
            $table->unsignedInteger('paragraphs_count');
            $table->unsignedInteger('places_count');
            $table->unsignedInteger('events_count');
            $table->unsignedInteger('routes_count');
            $table->dateTime('imported_at', 6);
            $table->primary(['resource_id', 'id']);
            $table->unique('slug', 'seerah_books_slug_unique');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
            $table->foreign('source_id')->references('id')->on('content_sources')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seerah_books');
    }
};

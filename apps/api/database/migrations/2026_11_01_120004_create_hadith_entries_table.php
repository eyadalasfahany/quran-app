<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0042 §5: one row per hadith. text_ar is byte-exact (bin). hadith_number is text, never numeric. The number index
 * is deliberately not unique until the import dry run shows whether duplicates exist.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hadith_entries', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->unsignedInteger('book_id');
            $table->unsignedInteger('chapter_id')->nullable();
            $table->string('hadith_number', 32);
            $table->string('arabic_number', 32)->nullable();
            $table->unsignedInteger('position');
            $table->mediumText('text_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->mediumText('text_en')->nullable();
            $table->mediumText('narrator_en')->nullable();
            $table->mediumText('text_search');
            $table->string('source_url', 500)->nullable();
            $table->foreignId('source_id');
            $table->string('source_key', 96);
            $table->char('source_text_sha256', 64);
            $table->string('source_version', 64);
            $table->dateTime('imported_at', 6);

            $table->primary(['resource_id', 'id']);
            $table->unique(['source_id', 'source_key'], 'hadith_entries_source_key_unique');
            $table->index(['resource_id', 'hadith_number'], 'hadith_entries_number_index');
            $table->index(['resource_id', 'book_id', 'chapter_id', 'position'], 'hadith_entries_book_position_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
            $table->foreign('source_id')->references('id')->on('content_sources')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hadith_entries');
    }
};

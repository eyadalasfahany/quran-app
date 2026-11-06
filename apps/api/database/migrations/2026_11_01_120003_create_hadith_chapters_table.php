<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hadith_chapters', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->unsignedInteger('book_id');
            $table->unsignedInteger('chapter_number');
            $table->string('source_chapter_key', 32)->nullable();
            $table->text('title_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->text('title_en')->nullable();
            $table->unsignedInteger('position');
            $table->unsignedInteger('hadith_count');
            $table->foreignId('source_id');
            $table->string('source_key', 96);

            $table->primary(['resource_id', 'id']);
            $table->unique(['source_id', 'source_key'], 'hadith_chapters_source_key_unique');
            $table->index(['resource_id', 'book_id', 'position'], 'hadith_chapters_book_position_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
            $table->foreign('source_id')->references('id')->on('content_sources')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hadith_chapters');
    }
};

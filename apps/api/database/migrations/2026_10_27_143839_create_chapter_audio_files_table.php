<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('chapter_audio_files', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->unsignedBigInteger('id')->primary();
            $table->foreignId('recitation_id');
            $table->unsignedTinyInteger('chapter_id');
            $table->string('audio_url', 500);
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->unsignedInteger('duration_ms');
            $table->string('format', 8);

            $table->unique(['recitation_id', 'chapter_id']);
            $table->foreign('recitation_id')->references('id')->on('recitations')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chapter_audio_files');
    }
};

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
        Schema::create('taybah_timing_sets', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->unsignedBigInteger('recitation_id');
            $table->unsignedTinyInteger('chapter_id');
            $table->string('audio_url', 500);
            $table->unsignedBigInteger('size_bytes');
            $table->char('sha256', 64);
            $table->unsignedInteger('measured_duration_ms');
            $table->string('source', 32);
            $table->string('tool_version', 32)->nullable();
            $table->json('models')->nullable();
            $table->unsignedInteger('original_first_start_ms')->nullable();
            $table->char('digest', 64);
            $table->dateTime('imported_at', 6);

            $table->unique(['recitation_id', 'chapter_id']);
            $table->foreign('recitation_id')->references('id')->on('recitations')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('taybah_timing_sets');
    }
};

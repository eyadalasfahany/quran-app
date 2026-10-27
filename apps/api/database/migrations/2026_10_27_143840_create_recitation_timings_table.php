<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('recitation_timings', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->unsignedBigInteger('audio_file_id');
            $table->unsignedSmallInteger('verse_id');
            $table->string('verse_key', 7);
            $table->unsignedInteger('start_ms');
            $table->unsignedInteger('end_ms');
            $table->json('segments')->nullable();

            $table->primary(['audio_file_id', 'verse_id']);
            $table->foreign('audio_file_id')->references('id')->on('chapter_audio_files')->cascadeOnDelete();
        });

        DB::statement('alter table `recitation_timings` add constraint `recitation_timings_start_before_end` check (`start_ms` < `end_ms`)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recitation_timings');
    }
};

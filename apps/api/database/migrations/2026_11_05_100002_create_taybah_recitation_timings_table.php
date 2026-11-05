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
        Schema::create('taybah_recitation_timings', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->unsignedBigInteger('recitation_id');
            $table->unsignedTinyInteger('chapter_id');
            $table->unsignedSmallInteger('verse_id');
            $table->unsignedInteger('start_ms');
            $table->unsignedInteger('end_ms');
            $table->json('segments')->nullable();

            $table->primary(['recitation_id', 'chapter_id', 'verse_id']);
            $table->foreign('recitation_id')->references('id')->on('recitations')->cascadeOnDelete();
        });

        DB::statement('alter table `taybah_recitation_timings` add constraint `taybah_recitation_timings_start_before_end` check (`start_ms` < `end_ms`)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('taybah_recitation_timings');
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dua_quran_spans', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('item_id');
            $table->unsignedSmallInteger('surah');
            $table->unsignedSmallInteger('verse_from');
            $table->unsignedSmallInteger('verse_to')->nullable();
            $table->text('review_status');
            $table->text('rule')->nullable();

            $table->primary(['resource_id', 'item_id']);
            $table->index(['resource_id', 'surah', 'verse_from'], 'dua_quran_spans_surah_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dua_quran_spans');
    }
};

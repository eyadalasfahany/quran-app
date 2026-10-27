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
        Schema::create('word_layouts', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->unsignedSmallInteger('mushaf_id');
            $table->unsignedInteger('word_id');
            $table->unsignedSmallInteger('verse_id');
            $table->unsignedSmallInteger('position_in_verse');
            $table->string('char_type', 16);
            $table->string('glyph', 32)->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->unsignedSmallInteger('page');
            $table->unsignedTinyInteger('line');
            $table->unsignedSmallInteger('position_in_line');

            $table->primary(['mushaf_id', 'word_id']);
            $table->index(['mushaf_id', 'page', 'line']);
            $table->index('verse_id');
            $table->foreign('mushaf_id')->references('id')->on('mushafs')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('word_layouts');
    }
};

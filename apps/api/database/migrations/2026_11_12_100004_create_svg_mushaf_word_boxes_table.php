<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0090 step 3: each word's box on its page, in page coordinates (y down), derived from the artwork and word_layouts.
 * `position` is the word's position in its ayah.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('svg_mushaf_word_boxes', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->foreignId('svg_mushaf_id')->constrained('svg_mushafs', 'id', 'svg_mushaf_word_boxes_mushaf_fk')->cascadeOnDelete();
            $table->unsignedSmallInteger('page');
            $table->unsignedTinyInteger('line');
            $table->unsignedTinyInteger('surah');
            $table->unsignedSmallInteger('ayah');
            $table->unsignedSmallInteger('position');
            $table->decimal('x0', 8, 2);
            $table->decimal('y0', 8, 2);
            $table->decimal('x1', 8, 2);
            $table->decimal('y1', 8, 2);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->unique(['svg_mushaf_id', 'surah', 'ayah', 'position'], 'svg_mushaf_word_boxes_word_unique');
            $table->index(['svg_mushaf_id', 'page'], 'svg_mushaf_word_boxes_page_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('svg_mushaf_word_boxes');
    }
};

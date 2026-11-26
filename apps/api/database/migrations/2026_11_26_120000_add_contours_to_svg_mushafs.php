<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0090 step 13 A4: the contour map of an edition (which TQP subpaths each word draws, and the blocks, ayah marks, sajda lines
 * and hizb ornaments). It has its own status and digest, so an approval of the word boxes does not approve it. Additive only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('svg_mushafs', function (Blueprint $table): void {
            $table->string('contours_status', 32)->default('none')->after('word_boxes_digest');
            $table->char('contours_digest', 64)->nullable()->after('contours_status');
        });

        Schema::create('svg_mushaf_word_contours', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->foreignId('svg_mushaf_id')->constrained('svg_mushafs', 'id', 'svg_mushaf_word_contours_mushaf_fk')->cascadeOnDelete();
            $table->unsignedTinyInteger('surah');
            $table->unsignedSmallInteger('ayah');
            $table->unsignedTinyInteger('position');
            $table->unsignedInteger('first');
            $table->unsignedSmallInteger('count');
            $table->unsignedTinyInteger('flag');
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->unique(['svg_mushaf_id', 'surah', 'ayah', 'position', 'first'], 'svg_mushaf_word_contours_run_unique');
        });

        Schema::create('svg_mushaf_contour_blocks', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->foreignId('svg_mushaf_id')->constrained('svg_mushafs', 'id', 'svg_mushaf_contour_blocks_mushaf_fk')->cascadeOnDelete();
            $table->unsignedSmallInteger('page');
            $table->unsignedTinyInteger('kind');
            $table->unsignedSmallInteger('ord');
            $table->unsignedTinyInteger('surah');
            $table->unsignedSmallInteger('ayah');
            $table->unsignedInteger('first');
            $table->unsignedSmallInteger('count');
            $table->integer('x0');
            $table->integer('y0');
            $table->integer('x1');
            $table->integer('y1');
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->unique(['svg_mushaf_id', 'page', 'kind', 'ord'], 'svg_mushaf_contour_blocks_block_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('svg_mushaf_contour_blocks');
        Schema::dropIfExists('svg_mushaf_word_contours');

        Schema::table('svg_mushafs', function (Blueprint $table): void {
            $table->dropColumn(['contours_status', 'contours_digest']);
        });
    }
};

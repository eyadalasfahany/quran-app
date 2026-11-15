<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0090 step 2: each ayah's polygon on a page, in page coordinates, as quran.ws gives it. An ayah that spans two pages
 * has one row on each. The polygon is stored exactly as received.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('svg_mushaf_ayah_regions', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->foreignId('svg_mushaf_id')->constrained('svg_mushafs', 'id', 'svg_mushaf_regions_mushaf_fk')->cascadeOnDelete();
            $table->unsignedSmallInteger('page');
            $table->unsignedTinyInteger('surah');
            $table->unsignedSmallInteger('ayah');
            $table->decimal('label_x', 8, 2);
            $table->decimal('label_y', 8, 2);
            $table->text('polygon');

            $table->unique(['svg_mushaf_id', 'page', 'surah', 'ayah'], 'svg_mushaf_regions_ayah_unique');
            $table->index(['svg_mushaf_id', 'surah', 'ayah'], 'svg_mushaf_regions_ayah_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('svg_mushaf_ayah_regions');
    }
};

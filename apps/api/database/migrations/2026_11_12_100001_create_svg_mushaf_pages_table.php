<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0090 step 2: one row per page of an imported SVG mushaf. The raw SVG is not stored; its SHA-1 blob id and size are
 * the pin, and the gzip digest is for the file the API serves.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('svg_mushaf_pages', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->foreignId('svg_mushaf_id')->constrained('svg_mushafs', 'id', 'svg_mushaf_pages_mushaf_fk')->cascadeOnDelete();
            $table->unsignedSmallInteger('page');
            $table->char('svg_blob_sha', 40);
            $table->unsignedInteger('svg_bytes');
            $table->char('gz_sha256', 64);
            $table->unsignedInteger('gz_bytes');
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();

            $table->unique(['svg_mushaf_id', 'page'], 'svg_mushaf_pages_page_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('svg_mushaf_pages');
    }
};

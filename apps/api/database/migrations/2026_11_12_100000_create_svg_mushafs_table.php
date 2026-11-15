<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0090 step 2: one row per imported riwayah edition of the quran-svg mushafs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('svg_mushafs', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->string('key', 16)->unique();
            $table->string('folder', 16);
            $table->unsignedSmallInteger('edition_year');
            $table->char('source_commit', 40);
            $table->unsignedSmallInteger('page_count');
            $table->unsignedSmallInteger('ayah_count');
            $table->dateTime('imported_at', 6);
            $table->dateTime('created_at', 6)->nullable();
            $table->dateTime('updated_at', 6)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('svg_mushafs');
    }
};

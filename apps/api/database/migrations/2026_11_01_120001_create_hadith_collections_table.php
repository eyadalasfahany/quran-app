<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0042 §2: one row per hadith collection; one collection per pack. Arabic columns are stored byte-for-byte (bin).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hadith_collections', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->string('slug', 32);
            $table->foreignId('source_id');
            $table->string('source_code', 32);
            $table->string('title_ar', 200)->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->string('title_en', 200)->nullable();
            $table->string('author_ar', 200)->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->string('author_en', 200)->nullable();
            $table->text('attribution_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->text('attribution_en');
            $table->string('source_url', 500)->nullable();
            $table->unsignedInteger('total_hadith');
            $table->unsignedInteger('books_count');
            $table->string('source_version', 64);
            $table->dateTime('imported_at', 6);

            $table->primary(['resource_id', 'id']);
            $table->unique('slug', 'hadith_collections_slug_unique');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
            $table->foreign('source_id')->references('id')->on('content_sources')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hadith_collections');
    }
};

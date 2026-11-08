<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0078 step 4: one explanation record as the source gave it. Every text column is stored byte-for-byte (utf8mb4_0900_bin),
 * and the benefits and words columns hold the source's JSON text as received (no MySQL json type: it re-encodes). Grades are
 * stored and hidden (ADR 0042 D4). Only records that a link names are stored (the plan: a pack keeps only linked passages).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hadith_explanations', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->foreignId('source_id');
            $table->string('source_key', 96);
            $table->mediumText('title_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->mediumText('attribution_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->mediumText('reference_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->mediumText('body_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->mediumText('benefits_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->mediumText('words_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->mediumText('intro_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->text('grade_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->string('source_url', 500);
            $table->char('source_sha256', 64);
            $table->string('source_version', 64);
            $table->dateTime('imported_at', 6);

            $table->primary(['resource_id', 'id']);
            $table->unique(['source_id', 'source_key'], 'hadith_explanations_source_key_unique');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
            $table->foreign('source_id')->references('id')->on('content_sources')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hadith_explanations');
    }
};

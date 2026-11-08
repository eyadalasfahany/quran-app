<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0078 step 4: an accepted link from one of our hadith (collection slug and number) to one explanation. Ids and numbers
 * only. status and evidence are server-only review fields and are never packed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hadith_explanation_links', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->string('collection_slug', 32);
            $table->string('hadith_number', 32);
            $table->unsignedInteger('explanation_id');
            $table->string('status', 16);
            $table->string('evidence', 64)->nullable();

            $table->primary(['resource_id', 'collection_slug', 'hadith_number', 'explanation_id'], 'hadith_explanation_links_primary');
            $table->index(['resource_id', 'explanation_id'], 'hadith_explanation_links_explanation_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hadith_explanation_links');
    }
};

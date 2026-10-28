<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0014: no Quran translations or word-by-word data. Removes the rows written for the
 * ignored resource groups. The rows deleted here are not restored by down().
 */
return new class extends Migration
{
    public function up(): void
    {
        $resourceIds = DB::table('resources')
            ->whereIn('group', ['translations', 'word_by_word_translations', 'word_by_word_transliterations'])
            ->pluck('id')
            ->all();

        if ($resourceIds !== []) {
            DB::table('content_changes')->whereIn('resource_id', $resourceIds)->delete();
            DB::table('content_packs')->whereIn('resource_id', $resourceIds)->delete();
            DB::table('resources')->whereIn('id', $resourceIds)->delete();
        }

        Schema::dropIfExists('translation_entries');
    }

    public function down(): void
    {
        Schema::create('translation_entries', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedSmallInteger('verse_id');
            $table->string('verse_key', 7);
            $table->text('text')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->json('footnotes')->nullable();
            $table->unsignedBigInteger('source_record_id')->nullable();

            $table->primary(['resource_id', 'verse_id']);
            $table->index('verse_id');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }
};

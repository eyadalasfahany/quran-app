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
        Schema::create('tafsir_entries', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->foreignId('resource_id');
            $table->unsignedBigInteger('group_tafsir_id');
            $table->unsignedSmallInteger('first_verse_id');
            $table->unsignedSmallInteger('last_verse_id');
            $table->string('first_verse_key', 7);
            $table->string('last_verse_key', 7);
            $table->mediumText('html')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->char('source_hash', 64);

            $table->unique(['resource_id', 'group_tafsir_id']);
            $table->index(['resource_id', 'first_verse_id', 'last_verse_id']);
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tafsir_entries');
    }
};

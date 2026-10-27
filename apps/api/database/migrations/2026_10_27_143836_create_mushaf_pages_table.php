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
        Schema::create('mushaf_pages', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->unsignedSmallInteger('mushaf_id');
            $table->unsignedSmallInteger('page_number');
            $table->unsignedSmallInteger('first_verse_id');
            $table->unsignedSmallInteger('last_verse_id');
            $table->unsignedInteger('first_word_id');
            $table->unsignedInteger('last_word_id');
            $table->unsignedSmallInteger('verses_count');
            $table->json('verse_mapping');

            $table->primary(['mushaf_id', 'page_number']);
            $table->foreign('mushaf_id')->references('id')->on('mushafs')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mushaf_pages');
    }
};

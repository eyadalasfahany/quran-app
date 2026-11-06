<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0042 §9: every grade is stored; none is served while config hadith.grades_visible is false.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hadith_grades', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->unsignedInteger('entry_id');
            $table->string('grade', 120);
            $table->string('graded_by', 200)->nullable();
            $table->foreignId('source_id');
            $table->string('source_key', 96);

            $table->primary(['resource_id', 'id']);
            $table->index(['resource_id', 'entry_id'], 'hadith_grades_entry_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
            $table->foreign('source_id')->references('id')->on('content_sources')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hadith_grades');
    }
};

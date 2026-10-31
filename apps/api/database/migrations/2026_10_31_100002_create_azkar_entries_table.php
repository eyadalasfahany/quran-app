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
        Schema::create('azkar_entries', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->string('entry_key', 191);
            $table->unsignedInteger('chapter_id');
            $table->unsignedInteger('position');
            $table->text('source_reference');
            $table->text('entry_type');
            $table->text('occasion')->nullable();
            $table->text('timing_type')->nullable();
            $table->text('timing_prayer')->nullable();
            $table->text('timing_policy_id')->nullable();
            $table->text('review_status');
            $table->text('source_version');
            $table->unsignedBigInteger('imported_at');

            $table->primary(['resource_id', 'id']);
            $table->unique('entry_key', 'azkar_entries_entry_key_unique');
            $table->index(['resource_id', 'chapter_id', 'position'], 'azkar_entries_chapter_position_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('azkar_entries');
    }
};

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
        Schema::create('azkar_notes', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->unsignedInteger('entry_id');
            $table->unsignedInteger('item_id')->nullable();
            $table->text('kind');
            $table->mediumText('text_ar')->nullable();
            $table->mediumText('text_en')->nullable();
            $table->text('grader')->nullable();
            $table->text('source_type');
            $table->text('source_name');
            $table->text('source_reference')->nullable();
            $table->text('source_url')->nullable();
            $table->text('review_status');

            $table->primary(['resource_id', 'id']);
            $table->index(['resource_id', 'entry_id'], 'azkar_notes_entry_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('azkar_notes');
    }
};

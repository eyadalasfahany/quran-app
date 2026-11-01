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
        Schema::create('azkar_items', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->unsignedInteger('entry_id');
            $table->string('item_key', 191);
            $table->string('variation_key', 64);
            $table->unsignedInteger('position');
            $table->text('kind');
            $table->unsignedInteger('required_count')->nullable();
            $table->text('speaker')->nullable();
            $table->text('source_dua_id')->nullable();
            $table->mediumText('text_en')->nullable();
            $table->mediumText('transliteration')->nullable();
            $table->text('source_text_sha256')->nullable();

            $table->primary(['resource_id', 'id']);
            $table->unique('item_key', 'azkar_items_item_key_unique');
            $table->index(['resource_id', 'entry_id', 'variation_key', 'position'], 'azkar_items_entry_variation_position_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('azkar_items');
    }
};

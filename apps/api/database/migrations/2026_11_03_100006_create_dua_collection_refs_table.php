<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dua_collection_refs', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->unsignedInteger('item_id');
            $table->string('collection_slug', 32);
            $table->string('hadith_number', 32);
            $table->text('review_status');
            $table->text('evidence')->nullable();

            $table->primary(['resource_id', 'id']);
            $table->index(['resource_id', 'item_id'], 'dua_collection_refs_item_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dua_collection_refs');
    }
};

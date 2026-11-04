<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dua_collection_books', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->string('collection_slug', 32);
            $table->string('book_number', 16);
            $table->unsignedInteger('position');

            $table->primary(['resource_id', 'id']);
            $table->unique(['resource_id', 'collection_slug', 'book_number'], 'dua_collection_books_slug_book_unique');
            $table->index(['resource_id', 'position'], 'dua_collection_books_position_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dua_collection_books');
    }
};

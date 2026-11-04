<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('names_verses', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->string('name_slug', 64);
            $table->string('verse_key', 16);
            $table->string('review_status', 32);
            $table->text('evidence')->nullable();

            $table->primary(['resource_id', 'name_slug', 'verse_key']);
            $table->index(['resource_id', 'review_status'], 'names_verses_review_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('names_verses');
    }
};

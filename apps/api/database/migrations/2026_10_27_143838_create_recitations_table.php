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
        Schema::create('recitations', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->foreignId('resource_id')->unique();
            $table->string('reciter_name', 200)->nullable();
            $table->string('reciter_name_ar', 200)->nullable();
            $table->string('style', 32)->nullable();
            $table->string('qirat', 32)->nullable();
            $table->boolean('has_word_segments')->default(false);

            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recitations');
    }
};

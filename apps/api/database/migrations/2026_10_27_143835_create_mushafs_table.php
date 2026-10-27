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
        Schema::create('mushafs', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->unsignedSmallInteger('id')->primary();
            $table->foreignId('resource_id')->unique();
            $table->string('name', 120);
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('pages_count');
            $table->unsignedTinyInteger('lines_per_page');
            $table->string('default_font_name', 32)->nullable();
            $table->string('mapping_mode', 32)->nullable();
            $table->string('qirat_name', 32)->nullable();

            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mushafs');
    }
};

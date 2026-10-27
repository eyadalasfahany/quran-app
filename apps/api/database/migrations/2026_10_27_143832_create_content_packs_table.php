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
        Schema::create('content_packs', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->foreignId('resource_id');
            $table->unsignedInteger('version');
            $table->string('path', 500);
            $table->unsignedBigInteger('size_bytes');
            $table->char('sha256', 64);
            $table->unsignedInteger('row_count');
            $table->unsignedSmallInteger('schema_version');
            $table->dateTime('built_at', 6);

            $table->unique(['resource_id', 'version']);
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('content_packs');
    }
};

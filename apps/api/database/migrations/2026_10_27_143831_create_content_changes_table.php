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
        Schema::create('content_changes', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->foreignId('resource_id');
            $table->unsignedInteger('version');
            $table->string('entity', 32);
            $table->string('entity_key', 64);
            $table->string('op', 32);
            $table->json('payload')->nullable();
            $table->dateTime('created_at', 6);

            $table->index(['resource_id', 'id']);
            $table->index('created_at');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('content_changes');
    }
};

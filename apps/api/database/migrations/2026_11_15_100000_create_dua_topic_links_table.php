<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dua_topic_links', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->string('topic_id', 64);
            $table->string('target_kind', 16);
            $table->string('target_key', 191);
            $table->unsignedInteger('position');

            $table->primary(['resource_id', 'id']);
            $table->unique(['resource_id', 'target_kind', 'target_key'], 'dua_topic_links_target_unique');
            $table->index(['resource_id', 'position'], 'dua_topic_links_position_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dua_topic_links');
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dua_groups', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->unsignedInteger('source_category_id');
            $table->text('title')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->unsignedInteger('position');

            $table->primary(['resource_id', 'id']);
            $table->index(['resource_id', 'position'], 'dua_groups_position_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dua_groups');
    }
};

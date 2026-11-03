<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('names', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->string('name_slug', 64);
            $table->unsignedTinyInteger('position');
            $table->mediumText('name_ar')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->text('text_search');

            $table->primary(['resource_id', 'id']);
            $table->unique(['resource_id', 'name_slug'], 'names_resource_slug_unique');
            $table->unique(['resource_id', 'position'], 'names_resource_position_unique');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('names');
    }
};

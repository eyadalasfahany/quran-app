<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('names_lists', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->string('list_slug', 64);
            $table->string('title_ar', 200);
            $table->string('source_label_ar', 500);
            $table->text('attribution_ar')->nullable();
            $table->text('attribution_en')->nullable();
            $table->string('edition_reference', 500)->nullable();
            $table->string('source_version', 64);

            $table->primary(['resource_id', 'list_slug']);
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('names_lists');
    }
};

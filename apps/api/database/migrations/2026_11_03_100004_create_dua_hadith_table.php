<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dua_hadith', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('item_id');
            $table->unsignedInteger('hadeeth_id');
            $table->mediumText('title')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->mediumText('hadeeth')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->mediumText('attribution')->charset('utf8mb4')->collation('utf8mb4_0900_bin');
            $table->text('grade')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->mediumText('explanation')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->mediumText('reference')->charset('utf8mb4')->collation('utf8mb4_0900_bin')->nullable();
            $table->json('hints')->nullable();
            $table->mediumText('text_search');
            $table->string('source_url', 500);
            $table->foreignId('source_id');
            $table->string('source_key', 96);
            $table->char('source_text_sha256', 64);
            $table->string('source_version', 64);
            $table->dateTime('imported_at', 6);

            $table->primary(['resource_id', 'item_id']);
            $table->index(['resource_id', 'hadeeth_id'], 'dua_hadith_hadeeth_index');
            $table->unique(['source_id', 'source_key'], 'dua_hadith_source_key_unique');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
            $table->foreign('source_id')->references('id')->on('content_sources')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dua_hadith');
    }
};

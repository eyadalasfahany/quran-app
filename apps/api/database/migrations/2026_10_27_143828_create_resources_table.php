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
        Schema::create('resources', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->foreignId('source_id');
            $table->string('group', 64);
            $table->string('source_key', 64);
            $table->unsignedBigInteger('source_content_id')->nullable();
            $table->string('name', 200)->nullable();
            $table->string('author_name', 200)->nullable();
            $table->string('language_name', 40)->nullable();
            $table->string('language_code', 8)->nullable();
            $table->string('direction', 16)->nullable();
            $table->unsignedInteger('version')->default(0);
            $table->unsignedInteger('changes_floor_version')->default(0);
            $table->unsignedBigInteger('source_sequence')->nullable();
            $table->char('checksum', 64)->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('unavailable_reason')->nullable();
            $table->dateTime('synced_at', 6)->nullable();
            $table->datetimes(6);

            $table->unique(['source_id', 'group', 'source_key']);
            $table->index(['group', 'language_code']);
            $table->foreign('source_id')->references('id')->on('content_sources');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resources');
    }
};

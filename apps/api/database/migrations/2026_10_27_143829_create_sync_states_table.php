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
        Schema::create('sync_states', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->string('environment', 32);
            $table->string('resource_group', 48);
            $table->string('resources_filter');
            $table->text('sync_token')->nullable();
            $table->unsignedBigInteger('last_sequence')->default(0);
            $table->dateTime('last_success_at', 6)->nullable();
            $table->text('last_error')->nullable();
            $table->datetimes(6);

            $table->unique(['environment', 'resource_group']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sync_states');
    }
};

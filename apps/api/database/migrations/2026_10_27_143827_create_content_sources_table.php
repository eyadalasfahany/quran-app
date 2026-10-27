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
        Schema::create('content_sources', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 120);
            $table->string('licence_url', 500);
            $table->text('attribution_ar');
            $table->text('attribution_en');
            $table->string('permission_status', 32);
            $table->text('notes')->nullable();
            $table->datetimes(6);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('content_sources');
    }
};

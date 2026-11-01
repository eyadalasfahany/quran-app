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
        Schema::create('azkar_recordings', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->unsignedInteger('id');
            $table->string('recording_key', 191);
            $table->unsignedInteger('item_id');
            $table->text('reciter_name');
            $table->text('reciter_name_ar')->nullable();
            $table->text('source');
            $table->text('remote_url');
            $table->unsignedInteger('duration_ms');
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->unsignedTinyInteger('stream_allowed');
            $table->unsignedTinyInteger('download_allowed');
            $table->unsignedTinyInteger('redistribution_allowed');
            $table->text('attribution_ar')->nullable();
            $table->text('attribution_en')->nullable();
            $table->text('licence');
            $table->text('licence_url')->nullable();
            $table->unsignedBigInteger('rights_verified_at')->nullable();

            $table->primary(['resource_id', 'id']);
            $table->unique('recording_key', 'azkar_recordings_recording_key_unique');
            $table->index(['resource_id', 'item_id'], 'azkar_recordings_item_index');
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('azkar_recordings');
    }
};

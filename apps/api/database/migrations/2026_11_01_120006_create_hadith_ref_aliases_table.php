<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0042: number aliases kept across a source switch. match stores an App\Domains\Hadith\Enums\HadithAliasMatch
 * value as a string, so a new case needs no migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hadith_ref_aliases', function (Blueprint $table): void {
            $table->charset('utf8mb4');
            $table->collation('utf8mb4_0900_ai_ci');
            $table->innoDb();

            $table->foreignId('resource_id');
            $table->string('old_number', 32);
            $table->string('new_number', 32)->nullable();
            $table->string('match', 16);
            $table->unsignedInteger('since_version');

            $table->primary(['resource_id', 'old_number', 'since_version']);
            $table->foreign('resource_id')->references('id')->on('resources')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hadith_ref_aliases');
    }
};

<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0076 §2.2 and step 6b.3: a covering row carries the lowest and highest number of the span it covers (a merged number
 * has no row of its own). source_code is the origin of a filled row (step 6b.4); null for the collection's primary source.
 * Both are additive and nullable; a normal row has them null.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hadith_entries', function (Blueprint $table): void {
            $table->string('number_first', 32)->nullable()->after('source_url');
            $table->string('number_last', 32)->nullable()->after('number_first');
            $table->string('source_code', 32)->nullable()->after('number_last');
        });
    }

    public function down(): void
    {
        Schema::table('hadith_entries', function (Blueprint $table): void {
            $table->dropColumn(['number_first', 'number_last', 'source_code']);
        });
    }
};

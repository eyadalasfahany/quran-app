<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ADR 0093 (plan docs/plans/partial-verse-segments.md, step 6.2). `word_from` and `word_to` are word positions in the
// quoted verses of a quran segment (word_from in quran_verse_from, word_to in the last verse). Both null means the whole
// verses, as every row before this migration. Nullable and additive: no existing row changes.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('azkar_segments', function (Blueprint $table): void {
            $table->unsignedSmallInteger('word_from')->nullable()->after('quran_verse_to');
            $table->unsignedSmallInteger('word_to')->nullable()->after('word_from');
        });
    }

    public function down(): void
    {
        Schema::table('azkar_segments', function (Blueprint $table): void {
            $table->dropColumn(['word_from', 'word_to']);
        });
    }
};

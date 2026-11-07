<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ADR 0077 amendment (7 Nov 2026): a file that records only part of a surah carries its range. Null means the whole
// surah, which is every QF and MP3Quran row. Additive and nullable.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chapter_audio_files', function (Blueprint $table): void {
            $table->unsignedSmallInteger('first_ayah')->nullable()->after('format');
            $table->unsignedSmallInteger('last_ayah')->nullable()->after('first_ayah');
        });
    }

    public function down(): void
    {
        Schema::table('chapter_audio_files', function (Blueprint $table): void {
            $table->dropColumn(['first_ayah', 'last_ayah']);
        });
    }
};

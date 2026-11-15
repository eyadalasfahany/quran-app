<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Plan docs/plans/azkar-duas-split.md, step 3. `entry_class` is dhikr or dua, set only for reviewed rows of config
// azkar_entry_types.php. `home` is 'duas' for a reviewed dua outside the session categories; null otherwise. Both are
// nullable and additive: an entry without a reviewed type keeps null in both, so existing rows need no backfill.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('azkar_entries', function (Blueprint $table): void {
            $table->string('entry_class', 16)->nullable()->after('entry_type');
            $table->string('home', 16)->nullable()->after('entry_class');
        });
    }

    public function down(): void
    {
        Schema::table('azkar_entries', function (Blueprint $table): void {
            $table->dropColumn(['entry_class', 'home']);
        });
    }
};

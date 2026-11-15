<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0090 step 3: the outcome of the last word-box build (gate W1-W7) and its digest. Only `approved` boxes reach a pack. The
 * status is a varchar cast to WordBoxesStatus (none, failed, pending_review, approved), as the migration rules ask for enums.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('svg_mushafs', function (Blueprint $table): void {
            $table->string('word_boxes_status', 32)->default('none')->after('ayah_count');
            $table->char('word_boxes_digest', 64)->nullable()->after('word_boxes_status');
        });
    }

    public function down(): void
    {
        Schema::table('svg_mushafs', function (Blueprint $table): void {
            $table->dropColumn(['word_boxes_status', 'word_boxes_digest']);
        });
    }
};

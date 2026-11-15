<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR 0090 decision 9: whether the pack carries word boxes, recorded when it is built. Approving the boxes later cannot make
 * an older pack claim boxes it does not have.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_packs', function (Blueprint $table): void {
            $table->boolean('has_word_boxes')->default(false)->after('schema_version');
        });
    }

    public function down(): void
    {
        Schema::table('content_packs', function (Blueprint $table): void {
            $table->dropColumn('has_word_boxes');
        });
    }
};

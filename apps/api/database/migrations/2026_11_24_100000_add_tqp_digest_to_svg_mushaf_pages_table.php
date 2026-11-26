<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('svg_mushaf_pages', function (Blueprint $table): void {
            $table->char('tqp_sha256', 64)->nullable()->after('gz_bytes');
            $table->unsignedInteger('tqp_bytes')->nullable()->after('tqp_sha256');
        });
    }

    public function down(): void
    {
        Schema::table('svg_mushaf_pages', function (Blueprint $table): void {
            $table->dropColumn(['tqp_sha256', 'tqp_bytes']);
        });
    }
};

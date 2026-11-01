<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
| `imported_at` holds a millisecond timestamp (ADR 0031 §3). Some local databases were built with a 32-bit column, which
| overflows on the first import. This widens it to the declared unsigned BIGINT. Widening keeps every existing value.
*/
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('azkar_entries', function (Blueprint $table): void {
            $table->unsignedBigInteger('imported_at')->change();
        });
    }

    public function down(): void
    {
        // Not reversed: narrowing back to 32 bits could truncate millisecond timestamps.
    }
};

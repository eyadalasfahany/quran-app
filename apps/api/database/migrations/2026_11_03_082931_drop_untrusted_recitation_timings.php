<?php

declare(strict_types=1);

use App\Domains\Content\Enums\ResourceGroup;
use App\Domains\Content\Events\ResourceContentChanged;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ADR 0052: chapter reciters in quran.untrusted_timing_recitations play without highlight. Their stored timing rows
 * go, and the resource moves to a new version that is also its changes floor, so an installed pack is replaced by one
 * without timings. A reciter with no stored timings is left alone, so running it again changes nothing.
 */
return new class extends Migration
{
    public function up(): void
    {
        $untrusted = config('quran.untrusted_timing_recitations', []);

        if (! is_array($untrusted) || $untrusted === []) {
            return;
        }

        $resources = DB::table('resources')
            ->where('group', ResourceGroup::ChapterRecitations->value)
            ->whereIn('source_key', array_map(strval(...), $untrusted))
            ->get(['id', 'version']);

        foreach ($resources as $resource) {
            $recitationId = DB::table('recitations')->where('resource_id', $resource->id)->value('id');

            if ($recitationId === null) {
                continue;
            }

            $fileIds = DB::table('chapter_audio_files')->where('recitation_id', $recitationId)->pluck('id')->all();
            $deleted = DB::table('recitation_timings')->whereIn('audio_file_id', $fileIds)->delete();

            if ($deleted === 0) {
                continue;
            }

            $version = (int) $resource->version + 1;
            DB::table('recitations')->where('id', $recitationId)->update(['has_word_segments' => false]);
            DB::table('content_changes')->where('resource_id', $resource->id)->delete();
            DB::table('resources')->where('id', $resource->id)->update(['version' => $version, 'changes_floor_version' => $version]);
            ResourceContentChanged::dispatch((int) $resource->id, $version);
        }
    }

    public function down(): void
    {
        // Deleted timings cannot be restored. Removing a reciter from the config lets the next content sync bring them back.
    }
};

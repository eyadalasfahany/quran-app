<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Services;

use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Models\SvgMushaf;

/**
 * Whether an edition's word boxes may reach a pack (ADR 0090 decisions 4 and 6). Only Hafs can be approved, and only when the
 * build's status, the config pin and the committed file all carry the same digest. Never throws: anything unexpected is false.
 */
final class WordBoxApproval
{
    public static function isApproved(SvgMushaf $mushaf): bool
    {
        if ($mushaf->key !== 'hafs' || $mushaf->word_boxes_status !== WordBoxesStatus::Approved) {
            return false;
        }

        $pinned = config('mushaf.approved_word_boxes.hafs');
        $digest = $mushaf->word_boxes_digest;

        if (! is_string($pinned) || $pinned === '' || ! is_string($digest) || ! hash_equals($pinned, $digest)) {
            return false;
        }

        $path = resource_path(sprintf((string) config('mushaf.word_box_files.output'), 'hafs'));

        if (! is_file($path)) {
            return false;
        }

        $contents = file_get_contents($path);
        $decoded = is_string($contents) ? json_decode($contents, true) : null;

        return is_array($decoded) && is_string($decoded['digest'] ?? null) && hash_equals($pinned, $decoded['digest']);
    }
}

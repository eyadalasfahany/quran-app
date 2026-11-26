<?php

declare(strict_types=1);

namespace App\Domains\Mushaf\Services;

use App\Domains\Mushaf\Enums\WordBoxesStatus;
use App\Domains\Mushaf\Models\SvgMushaf;

/**
 * Whether an edition's contour map may reach a pack (ADR 0090 step 13 A3 and A5). The map has its own digest and approval, and it
 * reaches a pack only with approved word boxes. A local-only publish may also carry a map that is pending review; a failed map
 * never does. Never throws: anything unexpected is false.
 */
final class WordContourApproval
{
    public static function isApproved(SvgMushaf $mushaf): bool
    {
        if ($mushaf->key !== 'hafs' || $mushaf->contours_status !== WordBoxesStatus::Approved || ! WordBoxApproval::isApproved($mushaf)) {
            return false;
        }

        $pinned = config('mushaf.approved_word_contours.hafs');
        $digest = $mushaf->contours_digest;

        if (! is_string($pinned) || $pinned === '' || ! is_string($digest) || ! hash_equals($pinned, $digest)) {
            return false;
        }

        $path = resource_path(sprintf((string) config('mushaf.word_box_files.contour_output'), 'hafs'));

        if (! is_file($path)) {
            return false;
        }

        $contents = file_get_contents($path);
        $decoded = is_string($contents) ? json_decode($contents, true) : null;

        return is_array($decoded) && is_string($decoded['digest'] ?? null) && hash_equals($pinned, $decoded['digest']);
    }

    /**
     * Whether the pack of this edition carries the contour rows now. `$withPending` is the local-only flag: a pending map is written,
     * a failed one never is.
     */
    public static function writes(SvgMushaf $mushaf, bool $withPending): bool
    {
        if (! WordBoxApproval::isApproved($mushaf)) {
            return false;
        }

        if (self::isApproved($mushaf)) {
            return true;
        }

        return $withPending && $mushaf->contours_status === WordBoxesStatus::PendingReview;
    }
}

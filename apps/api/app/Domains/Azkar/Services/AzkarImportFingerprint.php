<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Data\ImportPlan;

/**
 * The content fingerprint of one import (plan step 14 §3): a SHA-256 over the rows the import would write, and the
 * source's pinned file hash. Identical content gives an identical fingerprint, so a re-import does not bump the Azkar
 * resource version or rebuild the pack. Any change to a stored row changes it, whatever caused the change (a config
 * value, a secondary snapshot, a recording file that appeared). The import time is left out: it is not content.
 */
final class AzkarImportFingerprint
{
    public function of(string $sourceSha256, ImportPlan $plan): string
    {
        $entries = array_map(
            static fn (array $entry): array => array_diff_key($entry, ['imported_at' => true]),
            $plan->entries,
        );

        $payload = [
            'source_sha256' => $sourceSha256,
            'chapters' => $plan->chapters,
            'entries' => $entries,
            'items' => $plan->items,
            'segments' => $plan->segments,
            'categories' => $plan->categories,
            'entry_categories' => $plan->entryCategories,
            'notes' => $plan->notes,
            'recordings' => $plan->recordings,
        ];

        return hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}

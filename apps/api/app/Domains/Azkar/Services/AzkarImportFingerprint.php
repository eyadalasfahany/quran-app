<?php

declare(strict_types=1);

namespace App\Domains\Azkar\Services;

use App\Domains\Azkar\Data\ImportPlan;

/**
 * The content fingerprint of one import (plan step 14 §3): a SHA-256 over the rows the import would write, and the
 * source's pinned file hash. Identical content gives an identical fingerprint, so a re-import does not bump the Azkar
 * resource version or rebuild the pack. Any change to a stored row changes it, whatever caused the change (a config
 * value, a secondary snapshot, a recording file that appeared). The import time is left out: it is not content.
 *
 * Plan step 3: `entry_class` and `home` join an entry's input only when they are set. With no reviewed types, both are
 * null everywhere and the fingerprint is the one an import had before these columns existed (no version bump).
 *
 * ADR 0092 decision 2: config azkar_topics.php joins the input only when it holds at least one chapter row. With no rows
 * the fingerprint is the one an import had before the topic config existed. With rows, a change to the config (rows,
 * topic list or names) moves the fingerprint, so the resource version bumps.
 */
final class AzkarImportFingerprint
{
    /** @var list<string> Entry columns that are left out of the input while null. */
    private const array OPTIONAL_ENTRY_KEYS = ['entry_class', 'home'];

    public function of(string $sourceSha256, ImportPlan $plan): string
    {
        $entries = array_map(
            static function (array $entry): array {
                $entry = array_diff_key($entry, ['imported_at' => true]);

                foreach (self::OPTIONAL_ENTRY_KEYS as $key) {
                    if (($entry[$key] ?? null) === null) {
                        unset($entry[$key]);
                    }
                }

                return $entry;
            },
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

        $topicRows = config('azkar_topics.chapters', []);

        if (is_array($topicRows) && $topicRows !== []) {
            $payload['topics'] = config('azkar_topics', []);
        }

        return hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}

<?php

declare(strict_types=1);

namespace App\Domains\Duas\Services;

use App\Domains\Duas\Data\DuasImportPlan;

/** Content fingerprint for Duas imports: identical rows yield an identical hash (ADR 0044-duas §6). */
final class DuasImportFingerprint
{
    public function of(DuasImportPlan $plan, string $snapshotManifestSha = ''): string
    {
        $payload = [
            'snapshot_manifest_sha256' => $snapshotManifestSha,
            'items' => $plan->items,
            'quran_spans' => $plan->quranSpans,
            'groups' => $plan->groups,
            'hadith' => array_map(
                static fn (array $row): array => array_diff_key($row, ['imported_at' => true]),
                $plan->hadith,
            ),
            'links' => $plan->links,
            'collection_refs' => $plan->collectionRefs,
            'collection_books' => $plan->collectionBooks,
        ];

        // ADR 0092 decision 10: the reviewed topic config is part of the content, so a change to it moves the fingerprint.
        $payload['topics'] = config('duas_topics', []);
        $payload['topic_links'] = $plan->topicLinks;

        return hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}

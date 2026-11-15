<?php

declare(strict_types=1);

namespace App\Domains\Duas\Services;

use App\Domains\Azkar\Data\ImportIssue;
use App\Domains\Duas\Data\DuasImportPlan;
use App\Domains\Duas\Data\DuasImportStats;
use App\Support\QuranText\SearchTextNormalizer;
use Carbon\CarbonImmutable;

/**
 * Builds the Duas import plan from config maps and an optional HadeethEnc snapshot (ADR 0044-duas §6).
 */
final class DuasImportPlanner
{
    public function __construct(
        private readonly QuranDuaReferencePolicy $quranPolicy,
        private readonly SearchTextNormalizer $normalizer,
        private readonly DuasTopicPolicy $topicPolicy,
    ) {}

    /**
     * @param  array<string, mixed>  $quranMap  Unvalidated config rows, keyed by dua key.
     * @param  array<string, mixed>  $hisnLinks  Unvalidated config rows, keyed by dua key.
     * @param  array<string, mixed>  $collectionRefs  Unvalidated config rows, keyed by dua key.
     * @param  array<array-key, mixed>  $collectionBooks  Unvalidated config map, slug => book number.
     * @param  array<array-key, mixed>  $hadithRecords  Unvalidated snapshot records, keyed by HadeethEnc id.
     * @param  list<array{id: int, source_category_id: int, title: string, position: int}>  $hadithGroups
     * @param  array<int, int>  $hadithPrimaryGroup
     * @param  array<array-key, mixed>  $topicConfig  Unvalidated config/duas_topics.php: `quran` and `hadith_chapters` maps.
     * @param  list<string>  $knownTopicIds  The ids of config azkar_topics.php `topics`.
     * @return array{plan: DuasImportPlan, issues: list<ImportIssue>}
     */
    public function plan(
        array $quranMap,
        array $hisnLinks,
        array $collectionRefs,
        array $collectionBooks,
        array $hadithRecords,
        CarbonImmutable $importedAt,
        int $hadeethSourceId,
        string $hadeethSourceVersion,
        array $hadithGroups = [],
        array $hadithPrimaryGroup = [],
        array $topicConfig = [],
        array $knownTopicIds = [],
    ): array {
        $issues = [];
        $stats = new DuasImportStats;
        $items = [];
        $quranSpans = [];
        $nextItemId = 1;
        $nextLinkId = 1;
        $nextRefId = 1;
        $nextBookId = 1;
        $acceptedKeys = [];

        foreach ($this->sortedQuranKeys($quranMap) as $duaKey) {
            $spans = $quranMap[$duaKey] ?? null;

            if (! is_array($spans) || $spans === []) {
                continue;
            }

            $acceptedSpan = null;

            foreach ($spans as $index => $rawSpan) {
                if (! is_array($rawSpan)) {
                    $issues[] = new ImportIssue(ImportIssue::ERROR, 'invalid_quran_span', $duaKey, null, $duaKey);

                    continue;
                }

                $parsed = $this->quranPolicy->parse($rawSpan);

                if ($parsed === null) {
                    $issues[] = new ImportIssue(ImportIssue::ERROR, 'invalid_quran_span', $duaKey.'#'.$index, null, $duaKey);

                    continue;
                }

                $decision = $this->quranPolicy->decide($parsed['status']);

                if ($decision === QuranDuaReferencePolicy::DECISION_SKIP) {
                    $stats->quranSkipped++;

                    continue;
                }

                if ($decision === QuranDuaReferencePolicy::DECISION_INVALID) {
                    $issues[] = new ImportIssue(ImportIssue::ERROR, 'invalid_quran_reference', $duaKey, null, $duaKey);

                    continue;
                }

                if ($decision === QuranDuaReferencePolicy::DECISION_BLOCK) {
                    $stats->quranBlocked++;
                    $issues[] = new ImportIssue(ImportIssue::WARNING, 'quran_span_unreviewed', $duaKey, null, $duaKey);

                    continue;
                }

                if ($decision === QuranDuaReferencePolicy::DECISION_WARN_CANDIDATE) {
                    $issues[] = new ImportIssue(ImportIssue::WARNING, 'quran_span_candidate', $duaKey, null, $duaKey);
                }

                $acceptedSpan = $parsed;
                break;
            }

            if ($acceptedSpan === null) {
                continue;
            }

            $itemId = $nextItemId++;
            $position = count($acceptedKeys) + 1;
            $acceptedKeys[$duaKey] = $itemId;

            $items[] = [
                'id' => $itemId,
                'dua_key' => $duaKey,
                'kind' => 'quran',
                'group_id' => null,
                'position' => $position,
                'source_id' => null,
                'source_key' => null,
            ];

            $quranSpans[] = [
                'item_id' => $itemId,
                'surah' => $acceptedSpan['surah'],
                'verse_from' => $acceptedSpan['from'],
                'verse_to' => $acceptedSpan['to'],
                'review_status' => $acceptedSpan['status'],
                'rule' => $acceptedSpan['rule'],
            ];

            $stats->quranAccepted++;
        }

        $groups = $hadithGroups;
        $hadithRows = [];
        $hadithKeyToItem = [];

        $excludedHadiths = $this->excludedHadiths();

        if ($hadithRecords !== []) {
            foreach ($hadithRecords as $id => $record) {
                if (! is_array($record)) {
                    continue;
                }

                // ADR 0090 and ADR 0092 decision 4: a hadith left out of Duas (an excluded id, or a repeat of a Hisn entry)
                // gets no item and no issue.
                if (isset($excludedHadiths[(int) $id])) {
                    continue;
                }

                if ($hadithGroups !== [] && ! isset($hadithPrimaryGroup[$id])) {
                    continue;
                }

                $text = $record['hadeeth'] ?? null;

                if (! is_string($text) || $text === '') {
                    $issues[] = new ImportIssue(ImportIssue::ERROR, 'hadith_text_missing', 'hadith:'.$id, null, 'hadeethenc:'.$id);

                    continue;
                }

                $itemId = $nextItemId++;
                $duaKey = 'hadeethenc:'.$id;
                $hadithKeyToItem[$duaKey] = $itemId;
                $position = count($items) + 1;

                $groupId = $hadithPrimaryGroup[$id] ?? null;

                $items[] = [
                    'id' => $itemId,
                    'dua_key' => $duaKey,
                    'kind' => 'hadith',
                    'group_id' => $groupId,
                    'position' => $position,
                    'source_id' => $hadeethSourceId,
                    'source_key' => (string) $id,
                ];

                $siteUrl = rtrim((string) config('duas.hadeethenc.site_url'), '/').'/'.$id;
                $rawJson = json_encode($record, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);

                $hadithRows[] = [
                    'item_id' => $itemId,
                    'hadeeth_id' => $id,
                    'title' => (string) ($record['title'] ?? ''),
                    'hadeeth' => $text,
                    'attribution' => (string) ($record['attribution'] ?? ''),
                    'grade' => isset($record['grade']) && is_string($record['grade']) ? $record['grade'] : null,
                    'explanation' => isset($record['explanation']) && is_string($record['explanation']) ? $record['explanation'] : null,
                    'reference' => isset($record['reference']) && is_string($record['reference']) ? $record['reference'] : null,
                    'hints' => isset($record['hints']) ? json_encode($record['hints'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE) : null,
                    'text_search' => $this->normalizer->normalize($text),
                    'source_url' => $siteUrl,
                    'source_id' => $hadeethSourceId,
                    'source_key' => (string) $id,
                    'source_text_sha256' => hash('sha256', $rawJson),
                    'source_version' => $hadeethSourceVersion,
                    'imported_at' => $importedAt->format('Y-m-d H:i:s.u'),
                ];

                $stats->hadithAccepted++;
            }
        }

        $links = [];

        foreach ($hisnLinks as $duaKey => $rows) {
            if (! is_array($rows)) {
                continue;
            }

            $itemId = $hadithKeyToItem[$duaKey] ?? null;

            if ($itemId === null) {
                continue;
            }

            foreach ($rows as $link) {
                if (! is_array($link)) {
                    continue;
                }

                $status = (string) ($link['status'] ?? '');

                if ($status === 'candidate' && app()->isProduction()) {
                    continue;
                }

                if ($status !== 'reviewed' && $status !== 'candidate') {
                    continue;
                }

                if ($status === 'candidate') {
                    $issues[] = new ImportIssue(ImportIssue::WARNING, 'dua_link_candidate', $duaKey, null, $duaKey);
                }

                $links[] = [
                    'id' => $nextLinkId++,
                    'item_id' => $itemId,
                    'hadeeth_id' => (int) ($link['hadeeth_id'] ?? 0),
                    'entry_key' => (string) ($link['entry_key'] ?? ''),
                    'review_status' => $status,
                    'evidence' => isset($link['evidence']) && is_string($link['evidence']) ? $link['evidence'] : null,
                ];

                $stats->linksAccepted++;
            }
        }

        $refs = [];

        foreach ($collectionRefs as $duaKey => $rows) {
            if (! is_array($rows)) {
                continue;
            }

            $itemId = $hadithKeyToItem[$duaKey] ?? null;

            if ($itemId === null) {
                continue;
            }

            foreach ($rows as $ref) {
                if (! is_array($ref)) {
                    continue;
                }

                $status = (string) ($ref['status'] ?? '');

                if ($status === 'candidate' && app()->isProduction()) {
                    continue;
                }

                if ($status !== 'reviewed' && $status !== 'candidate') {
                    continue;
                }

                if ($status === 'candidate') {
                    $issues[] = new ImportIssue(ImportIssue::WARNING, 'dua_ref_candidate', $duaKey, null, $duaKey);
                }

                $refs[] = [
                    'id' => $nextRefId++,
                    'item_id' => $itemId,
                    'collection_slug' => (string) ($ref['collection_slug'] ?? ''),
                    'hadith_number' => (string) ($ref['hadith_number'] ?? ''),
                    'review_status' => $status,
                    'evidence' => isset($ref['evidence']) && is_string($ref['evidence']) ? $ref['evidence'] : null,
                ];

                $stats->refsAccepted++;
            }
        }

        $books = [];

        foreach ($collectionBooks as $slug => $bookNumber) {
            if (! is_string($slug) || $slug === '') {
                continue;
            }

            $books[] = [
                'id' => $nextBookId++,
                'collection_slug' => $slug,
                'book_number' => (string) $bookNumber,
                'position' => count($books) + 1,
            ];

            $stats->booksAccepted++;
        }

        $topicLinks = [];
        $resolvedTopics = $this->topicPolicy->resolve($topicConfig, $knownTopicIds);

        foreach ($resolvedTopics['invalid'] as $invalidKey) {
            $issues[] = new ImportIssue(ImportIssue::ERROR, 'dua_topic_invalid', $invalidKey, null, $invalidKey);
        }

        foreach ($resolvedTopics['candidates'] as $candidateKey) {
            $issues[] = new ImportIssue(ImportIssue::WARNING, 'dua_topic_candidate', $candidateKey, null, $candidateKey);
        }

        foreach ($resolvedTopics['links'] as $topicLink) {
            // ADR 0092 decision 10: a Quranic dua that is rejected or absent has no item, so its topic row is skipped.
            if ($topicLink['target_kind'] === DuasTopicPolicy::TARGET_QURAN && ! isset($acceptedKeys[$topicLink['target_key']])) {
                continue;
            }

            $topicLinks[] = [
                'id' => count($topicLinks) + 1,
                'topic_id' => $topicLink['topic_id'],
                'target_kind' => $topicLink['target_kind'],
                'target_key' => $topicLink['target_key'],
                'position' => count($topicLinks) + 1,
            ];
        }

        return [
            'plan' => new DuasImportPlan($items, $quranSpans, $groups, $hadithRows, $links, $refs, $books, $topicLinks, $stats),
            'issues' => $issues,
        ];
    }

    /**
     * The HadeethEnc ids left out of Duas, with the reason: config duas.hadeethenc.excluded_hadith_ids (ADR 0090), and
     * duas.hadeethenc.duplicate_of_hisn (ADR 0092 decision 4), which gives the Hisn entry_key the hadith repeats.
     *
     * @return array<int, string>
     */
    private function excludedHadiths(): array
    {
        $excluded = config('duas.hadeethenc.excluded_hadith_ids', []);
        $duplicates = config('duas.hadeethenc.duplicate_of_hisn', []);
        $reasons = [];

        foreach (is_array($excluded) ? $excluded : [] as $id => $reason) {
            $reasons[(int) $id] = (string) $reason;
        }

        foreach (is_array($duplicates) ? $duplicates : [] as $id => $entryKey) {
            $reasons[(int) $id] = 'duplicate_of_hisn:'.(string) $entryKey;
        }

        return $reasons;
    }

    /**
     * @param  array<string, mixed>  $quranMap
     * @return list<string>
     */
    private function sortedQuranKeys(array $quranMap): array
    {
        $keys = array_keys($quranMap);

        usort($keys, function (string $a, string $b) use ($quranMap): int {
            $pa = $this->sortKey($quranMap, $a);
            $pb = $this->sortKey($quranMap, $b);

            return $pa <=> $pb ?: strcmp($a, $b);
        });

        return $keys;
    }

    /**
     * @param  array<string, mixed>  $quranMap
     * @return array{int, int}
     */
    private function sortKey(array $quranMap, string $key): array
    {
        $spans = $quranMap[$key] ?? [];

        if (! is_array($spans)) {
            return [9999, 9999];
        }

        foreach ($spans as $rawSpan) {
            if (! is_array($rawSpan)) {
                continue;
            }

            $parsed = $this->quranPolicy->parse($rawSpan);

            if ($parsed !== null && $this->quranPolicy->decide($parsed['status']) !== QuranDuaReferencePolicy::DECISION_SKIP) {
                return [$parsed['surah'], $parsed['from']];
            }
        }

        return [9999, 9999];
    }
}
